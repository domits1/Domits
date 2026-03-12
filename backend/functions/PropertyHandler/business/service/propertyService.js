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
import { PropertyCalendarOverrideRepository } from "../../data/repository/propertyCalendarOverrideRepository.js";
import { PropertyExternalCalendarRepository } from "../../data/repository/propertyExternalCalendarRepository.js";
import { BookingRepository } from "../../data/repository/bookingRepository.js";
import { PropertyTestStatusRepository } from "../../data/repository/propertyTestStatusRepository.js";
import { PropertyDeletionRepository } from "../../data/repository/propertyDeletionRepository.js";

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
    this.propertyCalendarOverrideRepository = new PropertyCalendarOverrideRepository(systemManagerRepository);
    this.propertyExternalCalendarRepository = new PropertyExternalCalendarRepository(systemManagerRepository);
    this.propertyTechnicalDetailRepository = new PropertyTechnicalDetailRepository(systemManagerRepository);
    this.bookingRepository = new BookingRepository(dynamoDbClient, systemManagerRepository);
    this.propertyTestStatusRepository = new PropertyTestStatusRepository(systemManagerRepository);
    this.propertyDeletionRepository = new PropertyDeletionRepository(systemManagerRepository);
  }

  async create(property, { skipImages = false } = {}) {
    await this.createBasePropertyInfo(property.property);

    const tasks = [
      this.createAmenities(property.propertyAmenities),
      this.createAvailability(property.propertyAvailabilities),
      this.createCheckIn(property.propertyCheckIn),
      this.createGeneralDetail(property.propertyGeneralDetails),
      this.createLocation(property.propertyLocation),
      this.createPricing(property.propertyPricing),
      this.createRules(property.propertyRules),
      this.createPropertyType(property.propertyType),
      this.createAvailabilityRestrictions(property.propertyAvailabilityRestrictions),
      this.createPropertyTestStatus(property.propertyTestStatus),
    ];
    if (!skipImages) {
      tasks.push(this.createImages(property.propertyImages));
    }
    await Promise.all(tasks);
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

  async updatePropertyStatus(propertyId, nextStatus, metadata = {}) {
    const allowedStatuses = new Set(["ACTIVE", "INACTIVE", "ARCHIVED"]);
    const normalizedStatus = String(nextStatus || "").toUpperCase();
    if (!allowedStatuses.has(normalizedStatus)) {
      throw new DatabaseException("Invalid property status update.");
    }

    const property = await this.getBasePropertyInfo(propertyId);
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found.`);
    }

    if (property.status === normalizedStatus) {
      return property;
    }

    await this.propertyRepository.updatePropertyStatus(propertyId, normalizedStatus, metadata);
    const updatedProperty = await this.getBasePropertyInfo(propertyId);
    if (updatedProperty?.status !== normalizedStatus) {
      throw new DatabaseException("Property status update was not completed.");
    }
    return updatedProperty;
  }

  async updatePropertyOverview(propertyId, title, description, subtitle = undefined, updates = {}) {
    const property = await this.getBasePropertyInfo(propertyId);
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found.`);
    }
    const resolvedSubtitle = typeof subtitle === "string" ? subtitle : property.subtitle;
    const updatedProperty = await this.propertyRepository.updatePropertyOverview(
      propertyId,
      title,
      resolvedSubtitle,
      description
    );
    if (!updatedProperty) {
      throw new DatabaseException("Something went wrong while updating the property overview.");
    }

    if (updates?.capacity) {
      await this.updateCapacity(propertyId, updates.capacity);
    }

    if (updates?.location) {
      await this.updateLocation(propertyId, updates.location);
    }

    if (updates?.pricing) {
      await this.updatePricing(propertyId, updates.pricing);
    }

    if (updates?.availabilityRestrictions) {
      await this.updateAvailabilityRestrictions(propertyId, updates.availabilityRestrictions);
    }

    if (updates?.amenities) {
      await this.updateAmenities(propertyId, updates.amenities);
    }

    if (updates?.rules) {
      await this.updateRules(propertyId, updates.rules);
    }

    return updatedProperty;
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
    if (basePropertyInfo?.status !== "ACTIVE") {
      throw new NotFoundException(`Property ${propertyId} not found or inactive.`);
    }
    return await this.getFullPropertyAttributes(propertyId);
  }

  async getFullPropertyByIdAsHost(propertyId) {
    const basePropertyInfo = await this.getBasePropertyInfo(propertyId);
    if (!basePropertyInfo) {
      throw new NotFoundException(`Property ${propertyId} not found or inactive.`);
    }
    return await this.getFullPropertyAttributesWithFullLocation(propertyId);
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
    if (basePropertyInfo?.status !== "ACTIVE") {
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
    return this.getFullPropertyAttributesInternal(propertyId, false);
  }

  async getFullPropertyAttributesWithFullLocation(propertyId) {
    return this.getFullPropertyAttributesInternal(propertyId, true);
  }

  async getFullPropertyAttributesInternal(propertyId, includeFullLocation) {
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
      calendarAvailability,
      propertyTestStatus,
    ] = await Promise.all([
      this.getBasePropertyInfo(propertyId),
      this.getAmenities(propertyId),
      this.getAvailability(propertyId),
      this.getAvailabilityRestrictions(propertyId),
      this.getCheckIn(propertyId),
      this.getGeneralDetails(propertyId),
      this.getImages(propertyId),
      includeFullLocation ? this.getFullLocation(propertyId) : this.getLocation(propertyId),
      this.getPricing(propertyId),
      this.getRules(propertyId),
      this.getPropertyType(propertyId),
      this.getPublicCalendarAvailability(propertyId),
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
      calendarAvailability: calendarAvailability,
      technicalDetails: technicalDetails,
      propertyTestStatus: propertyTestStatus,
    };
  }

  async getPublicCalendarAvailability(propertyId) {
    const externalBlockedDates =
      await this.propertyExternalCalendarRepository.getBlockedDatesByPropertyId(propertyId);

    return {
      externalBlockedDates: Array.isArray(externalBlockedDates) ? externalBlockedDates : [],
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

  async updateAmenities(propertyId, amenityIds) {
    await this.propertyAmenityRepository.replaceAmenitiesByPropertyId(propertyId, amenityIds);
  }

  async createAvailability(availabilities) {
    const availabilityList = Array.isArray(availabilities) ? availabilities : [];
    for (const availability of availabilityList) {
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

  async updateCapacity(propertyId, capacity) {
    const detailUpdates = [
      { detail: "Guests", value: capacity.guests },
      { detail: "Bedrooms", value: capacity.bedrooms },
      { detail: "Beds", value: capacity.beds },
      { detail: "Bathrooms", value: capacity.bathrooms },
    ].filter((item) => item.value !== undefined);

    if (typeof capacity.spaceType === "string" && capacity.spaceType.trim()) {
      await this.propertyTypeRepository.updatePropertySpaceTypeByPropertyId(propertyId, capacity.spaceType.trim());
    }

    if (detailUpdates.length > 0) {
      await this.propertyGeneralDetailRepository.upsertPropertyGeneralDetailsByPropertyId(propertyId, detailUpdates);
    }
  }

  async createLocation(location) {
    const result = await this.propertyLocationRepository.create(location);
    if (!result) {
      throw new DatabaseException(`Failed to register property location.`);
    }
  }

  async updateLocation(propertyId, location) {
    const result = await this.propertyLocationRepository.updatePropertyLocationById(propertyId, location);
    if (!result) {
      throw new DatabaseException("Failed to update property location.");
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

  async updatePricing(propertyId, pricing) {
    const result = await this.propertyPricingRepository.upsertPricingByPropertyId(propertyId, pricing);
    if (!result) {
      throw new DatabaseException("Failed to update property pricing.");
    }
    return result;
  }

  async updateAvailabilityRestrictions(propertyId, restrictions) {
    return await this.propertyAvailabilityRestrictionRepository.replaceRestrictionsByPropertyId(propertyId, restrictions);
  }

  async getPropertyCalendarOverrides(propertyId, range = {}) {
    return await this.propertyCalendarOverrideRepository.getOverridesByPropertyId(propertyId, range);
  }

  async updatePropertyCalendarOverrides(propertyId, overrides, range = {}) {
    return await this.propertyCalendarOverrideRepository.upsertOverridesByPropertyId(propertyId, overrides, range);
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

  async updateRules(propertyId, rules) {
    await this.propertyRuleRepository.replaceRulesByPropertyId(propertyId, rules);
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

  async deleteImage(propertyId, imageId) {
    await this.propertyImageRepository.deleteImageByPropertyId(propertyId, imageId);
  }

  async deleteProperty(propertyId, options = {}) {
    const property = await this.getBasePropertyInfo(propertyId);
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found.`);
    }

    const bookingCount = await this.propertyDeletionRepository.getBookingCountByPropertyId(propertyId);
    if (bookingCount > 0) {
      const normalizedReasons = Array.isArray(options.reasons)
        ? options.reasons.map((reason) => String(reason || "").trim()).filter(Boolean)
        : [];
      await this.updatePropertyStatus(propertyId, "ARCHIVED", {
        archivedBy: options.actorId || "",
        archiveReason: normalizedReasons.join(","),
      });
      return {
        result: "archived",
        propertyId,
        bookingCount,
      };
    }

    await this.propertyImageRepository.deleteImagesByPropertyId(propertyId);
    await this.propertyDeletionRepository.deletePropertyById(propertyId);

    const deletedProperty = await this.getBasePropertyInfo(propertyId);
    if (deletedProperty) {
      throw new DatabaseException("Property deletion was not completed.");
    }

    return {
      result: "deleted",
      propertyId,
      bookingCount: 0,
    };
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
