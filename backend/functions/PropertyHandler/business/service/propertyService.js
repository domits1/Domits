import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SystemManagerRepository } from "../../data/repository/systemManagerRepository.js";

import { PropertyAmenityRepository } from "../../data/repository/propertyAmenityRepository.js";
import { PropertyRepository } from "../../data/repository/propertyRepository.js";
import { PropertyAvailabilityRepository } from "../../data/repository/propertyAvailabilityRepository.js";
import { PropertyAvailabilityRestrictionRepository } from "../../data/repository/propertyAvailabilityRestrictionRepository.js";
import { PropertyCheckInRepository } from "../../data/repository/propertyCheckInRepository.js";
import { PropertyGeneralDetailRepository } from "../../data/repository/propertyGeneralDetailRepository.js";
import { PropertyLocationRepository } from "../../data/repository/propertyLocationRepository.js";
import { PropertyPricingRepository } from "../../data/repository/propertyPricingRepository.js";
import { PropertyRuleRepository } from "../../data/repository/propertyRuleRepository.js";
import { PropertyTechnicalDetailRepository } from "../../data/repository/propertyTechnicalDetailRepository.js";
import { PropertyTypeRepository } from "../../data/repository/propertyTypeRepository.js";
import { PropertyImageRepository } from "../../data/repository/propertyImageRepository.js";
import { BookingRepository } from "../../data/repository/bookingRepository.js";
import { PropertyTestStatusRepository } from "../../data/repository/propertyTestStatusRepository.js";

import { DatabaseException } from "../../util/exception/DatabaseException.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { Forbidden } from "../../util/exception/Forbidden.js";

export class PropertyService {
  constructor(dynamoDbClient = new DynamoDBClient({}), systemManagerRepository = new SystemManagerRepository()) {
    this.propertyRepository = new PropertyRepository(systemManagerRepository);
    this.propertyAmenityRepository = new PropertyAmenityRepository(systemManagerRepository);
    this.propertyAvailabilityRepository = new PropertyAvailabilityRepository(systemManagerRepository);
    this.propertyAvailabilityRestrictionRepository = new PropertyAvailabilityRestrictionRepository(
      systemManagerRepository
    );
    this.propertyCheckInRepository = new PropertyCheckInRepository(systemManagerRepository);
    this.propertyGeneralDetailRepository = new PropertyGeneralDetailRepository(systemManagerRepository);
    this.propertyLocationRepository = new PropertyLocationRepository(systemManagerRepository);
    this.propertyPricingRepository = new PropertyPricingRepository(systemManagerRepository);
    this.propertyRuleRepository = new PropertyRuleRepository(systemManagerRepository);
    this.propertyTypeRepository = new PropertyTypeRepository(systemManagerRepository);
    this.propertyImageRepository = new PropertyImageRepository(systemManagerRepository);
    this.propertyTechnicalDetailRepository = new PropertyTechnicalDetailRepository(systemManagerRepository);
    this.bookingRepository = new BookingRepository(dynamoDbClient, systemManagerRepository);
    this.propertyTestStatusRepository = new PropertyTestStatusRepository(systemManagerRepository);
  }

  async create(property) {
    await this.createBasePropertyInfo(property.property);

    await Promise.all([
      this.createAmenities(property.propertyAmenities),
      this.createAvailability(property.propertyAvailabilities),
      this.createCheckIn(property.propertyCheckIn),
      this.createGeneralDetail(property.propertyGeneralDetails),
      this.createLocation(property.propertyLocation),
      this.createPricing(property.propertyPricing),
      this.createRules(property.propertyRules),
      this.createPropertyType(property.propertyType),
      this.createImages(property.propertyImages),
      this.createAvailabilityRestrictions(property.propertyAvailabilityRestrictions),
      this.createPropertyTestStatus(property.propertyTestStatus),
    ]);
    if (property.propertyType.property_type === "Boat" || property.propertyType.property_type === "Camper") {
      await this.createTechnicalDetails(property.propertyTechnicalDetails);
    }
  }

  async activateProperty(propertyId) {
    const property = await this.getBasePropertyInfo(propertyId);
    if (property.status === "ACTIVE") {
      throw new DatabaseException("This property is already active.");
    }
    await this.propertyRepository.activateProperty(propertyId, property);
    const newProperty = await this.getBasePropertyInfo(propertyId);

    if (property === newProperty) {
      throw new DatabaseException("Something went wrong while updating the activity status");
    }
  }

  async updateAutomatedMessages(propertyId, welcomeMessage, checkinMessage) {
      const property = await this.getBasePropertyInfo(propertyId);
      if (!property) {
          throw new NotFoundException(`Property ${propertyId} not found.`);
      }
      await this.propertyRepository.updateAutomatedMessages(propertyId, welcomeMessage, checkinMessage);
  }

  async getActivePropertyCards(lastEvaluatedKey) {
    const propertyIdentifiers = await this.propertyRepository.getActiveProperties(lastEvaluatedKey);
    const properties = await Promise.all(
      propertyIdentifiers.identifiers.map(async (property) => await this.getCardPropertyAttributes(property))
    );
    return {
      properties: properties,
      lastEvaluatedKey: propertyIdentifiers.lastEvaluatedKey,
    };
  }

  async getActivePropertyCardsByType(type) {
    const propertyIdentifiers = await this.propertyRepository.getActivePropertiesByType(type);
    return await Promise.all(
      propertyIdentifiers.map(async (property) => await this.getCardPropertyAttributes(property))
    );
  }

  async getActivePropertyCardsByCountry(country, lastEvaluatedKey) {
    let countryParam;
    if (country.split(" ").length > 1) {
      const words = country.trim().split(" ");
      const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      countryParam = capitalizedWords.join(" ");
    } else {
      countryParam = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
    }
    const propertyIdentifiers = await this.propertyLocationRepository.getActivePropertiesByCountry(
      countryParam,
      lastEvaluatedKey
    );
    const properties = await Promise.all(
      propertyIdentifiers.identifiers.map(async (property) => await this.getCardPropertyAttributes(property))
    );
    return {
      properties: properties,
      lastEvaluatedKey: propertyIdentifiers.lastEvaluatedKey,
    };
  }

  async getFullActivePropertyById(propertyId) {
    const basePropertyInfo = await this.getBasePropertyInfo(propertyId);
    if (!basePropertyInfo || basePropertyInfo.status !== "ACTIVE") {
      throw new NotFoundException(`Property ${propertyId} not found or inactive.`);
    }
    return await this.getFullPropertyAttributes(propertyId);
  }

  async getFullPropertyByIdAsHost(propertyId) {
    const basePropertyInfo = await this.getBasePropertyInfo(propertyId);
    if (!basePropertyInfo) {
      throw new NotFoundException(`Property ${propertyId} not found or inactive.`);
    }
    return await this.getFullPropertyAttributes(propertyId);
  }

  async getFullPropertyByBookingId(bookingId) {
    const booking = await this.bookingRepository.getBookingById(bookingId);
    if (booking.status !== "Paid") {
      throw new Forbidden("Payment must be processed before accessing the full property details.");
    }
    const basePropertyInfo = await this.getBasePropertyInfo(booking.property_id);
    if (!basePropertyInfo) {
      throw new NotFoundException(`Property ${booking.property_id} not found or inactive.`);
    }
    return await this.getFullPropertyAttributesWithFullLocation(basePropertyInfo.id);
  }

  async getFullPropertiesByHostId(hostId) {
    const propertyIdentifiers = await this.propertyRepository.getPropertiesByHostId(hostId);
    return await Promise.all(propertyIdentifiers.map(async (property) => this.getFullPropertyAttributes(property)));
  }

  async getActivePropertyCardsByHostId(hostId) {
    const propertyIdentifiers = await this.propertyRepository.getActivePropertiesByHostId(hostId);
    return await Promise.all(
      propertyIdentifiers.map(async (property) => await this.getCardPropertyAttributes(property))
    );
  }

  async getActivePropertyCardById(propertyId) {
    const basePropertyInfo = await this.getBasePropertyInfo(propertyId);
    if (!basePropertyInfo || basePropertyInfo.status !== "ACTIVE") {
      throw new NotFoundException(`Property ${propertyId} not found or inactive.`);
    }
    return await this.getCardPropertyAttributes(propertyId);
  }

  async getCardPropertyAttributes(propertyId) {
    const [basePropertyInfo, generalDetails, pricing, images, location, testStatus] = await Promise.all([
      this.getBasePropertyInfo(propertyId),
      this.getGeneralDetails(propertyId),
      this.getPricing(propertyId),
      this.getImages(propertyId),
      this.getLocation(propertyId),
      this.getPropertyTestStatus(propertyId),
    ]);
    if (!basePropertyInfo) {
      throw new NotFoundException(`Property ${propertyId} not found.`);
    }
    return {
      property: basePropertyInfo,
      propertyGeneralDetails: generalDetails,
      propertyPricing: pricing,
      propertyImages: images,
      propertyLocation: location,
      propertyTestStatus: testStatus,
    };
  }

  async getFullPropertyAttributes(propertyId) {
    const [
      basePropertyInfo,
      amenities,
      availability,
      availabilityRestrictions,
      checkIn,
      generalDetails,
      images,
      location,
      pricing,
      rules,
      propertyType,
      propertyTestStatus,
    ] = await Promise.all([
      this.getBasePropertyInfo(propertyId),
      this.getAmenities(propertyId),
      this.getAvailability(propertyId),
      this.getAvailabilityRestrictions(propertyId),
      this.getCheckIn(propertyId),
      this.getGeneralDetails(propertyId),
      this.getImages(propertyId),
      this.getLocation(propertyId),
      this.getPricing(propertyId),
      this.getRules(propertyId),
      this.getPropertyType(propertyId),
      this.getPropertyTestStatus(propertyId),
    ]);
    const technicalDetails =
      propertyType.property_type === "Boat" || propertyType.property_type === "Camper"
        ? await this.getTechnicalDetails(propertyId)
        : null;
    return {
      property: basePropertyInfo,
      amenities: amenities,
      availability: availability,
      availabilityRestrictions: availabilityRestrictions,
      checkIn: checkIn,
      generalDetails: generalDetails,
      images: images,
      location: location,
      pricing: pricing,
      rules: rules,
      propertyType: propertyType,
      technicalDetails: technicalDetails,
      propertyTestStatus: propertyTestStatus,
    };
  }

  async getFullPropertyAttributesWithFullLocation(propertyId) {
    const [
      basePropertyInfo,
      amenities,
      availability,
      availabilityRestrictions,
      checkIn,
      generalDetails,
      images,
      location,
      pricing,
      rules,
      propertyType,
      propertyTestStatus,
    ] = await Promise.all([
      this.getBasePropertyInfo(propertyId),
      this.getAmenities(propertyId),
      this.getAvailability(propertyId),
      this.getAvailabilityRestrictions(propertyId),
      this.getCheckIn(propertyId),
      this.getGeneralDetails(propertyId),
      this.getImages(propertyId),
      this.getFullLocation(propertyId),
      this.getPricing(propertyId),
      this.getRules(propertyId),
      this.getPropertyType(propertyId),
      this.getPropertyTestStatus(propertyId),
    ]);
    const technicalDetails =
      propertyType.property_type === "Boat" || propertyType.property_type === "Camper"
        ? await this.getTechnicalDetails(propertyId)
        : null;
    return {
      property: basePropertyInfo,
      amenities: amenities,
      availability: availability,
      availabilityRestrictions: availabilityRestrictions,
      checkIn: checkIn,
      generalDetails: generalDetails,
      images: images,
      location: location,
      pricing: pricing,
      rules: rules,
      propertyType: propertyType,
      technicalDetails: technicalDetails,
      propertyTestStatus: propertyTestStatus,
    };
  }

  async validatePropertyType(type) {
    const propertyType = await this.propertyTypeRepository.getPropertyTypeById(type);
    if (!propertyType) {
      throw new NotFoundException(`Property type ${type} not found.`);
    }
    return propertyType;
  }

  async createBasePropertyInfo(property) {
    const result = await this.propertyRepository.create(property);
    if (!result) {
      throw new DatabaseException(`Failed to register property.`);
    }
  }

  async getBasePropertyInfo(property) {
    return await this.propertyRepository.getPropertyById(property);
  }

  async createAmenities(amenities) {
    for (const amenity of amenities) {
      const result = await this.propertyAmenityRepository.create(amenity);
      if (!result) {
        throw new DatabaseException(`Failed to register ${amenity.amenityId} to property.`);
      }
    }
  }

  async getAmenities(property) {
    return await this.propertyAmenityRepository.getAmenitiesByPropertyId(property);
  }

  async createAvailability(availabilities) {
    for (const availability of availabilities) {
      const result = await this.propertyAvailabilityRepository.create(availability);
      if (!result) {
        throw new DatabaseException(`Failed to register property availability.`);
      }
    }
  }

  async getAvailability(property) {
    return await this.propertyAvailabilityRepository.getAvailabilityByPropertyId(property);
  }

  async createAvailabilityRestrictions(restrictions) {
    for (const restriction of restrictions) {
      const result = await this.propertyAvailabilityRestrictionRepository.create(restriction);
      if (!result) {
        throw new DatabaseException(`Failed to register ${restriction.restriction} to property.`);
      }
    }
  }

  async getAvailabilityRestrictions(property) {
    return await this.propertyAvailabilityRestrictionRepository.getAvailabilityRestrictionsByPropertyId(property);
  }

  async createCheckIn(timeslots) {
    const result = await this.propertyCheckInRepository.create(timeslots);
    if (!result) {
      throw new DatabaseException(`Failed to register check in timeslots.`);
    }
  }

  async getCheckIn(property) {
    return await this.propertyCheckInRepository.getPropertyCheckInTimeslotsByPropertyId(property);
  }

  async createGeneralDetail(details) {
    for (const detail of details) {
      const result = await this.propertyGeneralDetailRepository.create(detail);
      if (!result) {
        throw new DatabaseException(`Failed to register ${detail.detail} to property.`);
      }
    }
  }

  async getGeneralDetails(property) {
    return await this.propertyGeneralDetailRepository.getPropertyGeneralDetailsByPropertyId(property);
  }

  async createLocation(location) {
    const result = await this.propertyLocationRepository.create(location);
    if (!result) {
      throw new DatabaseException(`Failed to register property location.`);
    }
  }

  async getLocation(property) {
    return await this.propertyLocationRepository.getPropertyLocationById(property);
  }

  async getFullLocation(property) {
    return await this.propertyLocationRepository.getFullPropertyLocationById(property);
  }

  async createPricing(pricing) {
    const result = await this.propertyPricingRepository.create(pricing);
    if (!result) {
      throw new DatabaseException(`Failed to register property pricing.`);
    }
  }

  async getPricing(property) {
    return await this.propertyPricingRepository.getPricingById(property);
  }

  async createRules(rules) {
    for (const rule of rules) {
      const result = await this.propertyRuleRepository.create(rule);
      if (!result) {
        throw new DatabaseException(`Failed to register ${rule.rule} to property.`);
      }
    }
  }

  async getRules(property) {
    return await this.propertyRuleRepository.getRulesByPropertyId(property);
  }

  async createPropertyType(type) {
    const result = await this.propertyTypeRepository.create(type);
    if (!result) {
      throw new DatabaseException(`Failed to register property type.`);
    }
  }

  async createImages(images) {
    for (const image of images) {
      const result = await this.propertyImageRepository.create(image);
      if (!result) {
        throw new DatabaseException(`Failed to register ${images.key} to property.`);
      }
    }
  }

  async getImages(property) {
    return await this.propertyImageRepository.getImagesByPropertyId(property);
  }

  async createTechnicalDetails(details) {
    const result = await this.propertyTechnicalDetailRepository.create(details);
    if (!result) {
      throw new DatabaseException(`Failed to register technical details to property.`);
    }
  }

  async getTechnicalDetails(property) {
    return await this.propertyTechnicalDetailRepository.getTechnicalDetailsByPropertyId(property);
  }

  async getPropertyType(property) {
    return await this.propertyTypeRepository.getPropertyTypeByPropertyId(property);
  }

  async getPropertyTestStatus(property) {
    return await this.propertyTestStatusRepository.getPropertyTestStatusByPropertyId(property);
  }

  async createPropertyTestStatus(testStatus) {
    return await this.propertyTestStatusRepository.create(testStatus);
  }
}
