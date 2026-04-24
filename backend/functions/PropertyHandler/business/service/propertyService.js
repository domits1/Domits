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
import { PropertyCancellationPolicyRepository } from "../../data/repository/propertyCancellationPolicyRepository.js";
import { PropertyLateCheckinRepository } from "../../data/repository/propertyLateCheckinRepository.js";
import { PropertyHouseRuleRepository } from "../../data/repository/propertyHouseRuleRepository.js";
import { PropertyCustomRuleRepository } from "../../data/repository/propertyCustomRuleRepository.js";

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
    this.propertyCancellationPolicyRepository = new PropertyCancellationPolicyRepository(systemManagerRepository);
    this.propertyLateCheckinRepository = new PropertyLateCheckinRepository(systemManagerRepository);
    this.propertyHouseRuleRepository = new PropertyHouseRuleRepository(systemManagerRepository);
    this.propertyCustomRuleRepository = new PropertyCustomRuleRepository(systemManagerRepository);
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

    if (updates?.checkIn) {
      await this.updateCheckIn(propertyId, updates.checkIn);
    }

    if (updates?.cancellationPolicy) {
      await this.updateCancellationPolicy(propertyId, updates.cancellationPolicy);
    }

    if (updates?.lateCheckin) {
      await this.updateLateCheckin(propertyId, updates.lateCheckin);
    }

    if (updates?.houseRules) {
      await this.updateHouseRules(propertyId, updates.houseRules);
    }

    if (updates?.customRules) {
      await this.updateCustomRules(propertyId, updates.customRules);
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
    return await this.getFullPropertyAttributes(propertyId, { includeCalendarAvailability: true });
  }

  async getFullPropertyByIdAsHost(propertyId) {
    const basePropertyInfo = await this.getBasePropertyInfo(propertyId);
    if (!basePropertyInfo) {
      throw new NotFoundException(`Property ${propertyId} not found or inactive.`);
    }
    return await this.getFullPropertyAttributesWithFullLocation(propertyId, {
      includeCalendarAvailability: true,
    });
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

  async getFullPropertyAttributes(propertyId, options = {}) {
    return this.getFullPropertyAttributesInternal(propertyId, false, options);
  }

  async getFullPropertyAttributesWithFullLocation(propertyId, options = {}) {
    return this.getFullPropertyAttributesInternal(propertyId, true, options);
  }

  async getFullPropertyAttributesInternal(propertyId, includeFullLocation, options = {}) {
    const { includeCalendarAvailability = false } = options;
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
      cancellationPolicy,
      lateCheckin,
      houseRules,
      customRules,
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
      this.getPropertyTestStatus(propertyId),
      this.getCancellationPolicy(propertyId),
      this.getLateCheckin(propertyId),
      this.getHouseRules(propertyId),
      this.getCustomRules(propertyId),
    ]);
    const resolvedCheckIn = checkIn || this.buildCheckInFromRules(propertyId, rules);
    const technicalDetails =
      propertyType.property_type === "Boat" || propertyType.property_type === "Camper"
        ? await this.getTechnicalDetails(propertyId)
        : null;
    const response = {
      property: basePropertyInfo,
      amenities: amenities,
      availability: availability,
      availabilityRestrictions: availabilityRestrictions,
      checkIn: resolvedCheckIn,
      cancellationPolicy: cancellationPolicy,
      lateCheckin: lateCheckin,
      houseRules: houseRules,
      customRules: customRules,
      generalDetails: generalDetails,
      images: images,
      location: location,
      pricing: pricing,
      rules: rules,
      propertyType: propertyType,
      technicalDetails: technicalDetails,
      propertyTestStatus: propertyTestStatus,
    };
    if (includeCalendarAvailability) {
      response.calendarAvailability = await this.getPublicCalendarAvailability(propertyId);
    }
    return response;
  }

  async getPublicCalendarAvailability(propertyId) {
    const availabilitySnapshot =
      await this.propertyExternalCalendarRepository.getAvailabilitySnapshotByPropertyId(propertyId);

    return {
      externalBlockedDates: Array.isArray(availabilitySnapshot?.externalBlockedDates)
        ? availabilitySnapshot.externalBlockedDates
        : [],
      hasExternalCalendarSync: availabilitySnapshot?.hasExternalCalendarSync === true,
      syncedSourceCount: Math.max(0, Number(availabilitySnapshot?.syncedSourceCount || 0)),
      lastSyncAt: Number(availabilitySnapshot?.lastSyncAt || 0) || null,
      syncSources: Array.isArray(availabilitySnapshot?.syncSources) ? availabilitySnapshot.syncSources : [],
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

  async updateCheckIn(propertyId, checkIn) {
    const result = await this.propertyCheckInRepository.upsertPropertyCheckInByPropertyId(propertyId, checkIn);
    if (!result) {
      throw new DatabaseException("Failed to update property check-in settings.");
    }
    return result;
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
    return await this.propertyAvailabilityRestrictionRepository.replaceRestrictionsByPropertyId(
      propertyId,
      restrictions
    );
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

  async getCheckInRules(propertyId) {
    const rules = await this.propertyRuleRepository.getRulesByPropertyId(propertyId);
    return this.buildCheckInFromRules(propertyId, rules);
  }

  buildCheckInFromRules(propertyId, rules) {
    if (!rules || rules.length === 0) return null;

    const checkInFrom = rules.find((r) => r.rule === "CheckInFrom");
    const checkInTill = rules.find((r) => r.rule === "CheckInTill");
    const checkOutFrom = rules.find((r) => r.rule === "CheckOutFrom");
    const checkOutTill = rules.find((r) => r.rule === "CheckOutTill");

    if (!checkInFrom && !checkInTill && !checkOutFrom && !checkOutTill) {
      return null;
    }

    return {
      property_id: propertyId,
      checkIn: {
        from: checkInFrom?.value || "09:00:00",
        till: checkInTill?.value || "18:00:00",
      },
      checkOut: {
        from: checkOutFrom?.value || "07:00:00",
        till: checkOutTill?.value || "08:00:00",
      },
    };
  }

  async #upsertPropertyRule(propertyId, ruleName, value) {
    await this.propertyRuleRepository.upsertRuleByPropertyId(propertyId, ruleName, value);
  }

  async updateCheckInTimeslotRule(propertyId, checkInData) {
    if (!checkInData || typeof checkInData !== "object") return;

    const rulesToUpdate = [
      { rule: "CheckInFrom", value: checkInData.checkIn?.from || "09:00:00" },
      { rule: "CheckInTill", value: checkInData.checkIn?.till || "18:00:00" },
      { rule: "CheckOutFrom", value: checkInData.checkOut?.from || "07:00:00" },
      { rule: "CheckOutTill", value: checkInData.checkOut?.till || "08:00:00" },
    ];

    for (const ruleUpdate of rulesToUpdate) {
      await this.#upsertPropertyRule(propertyId, ruleUpdate.rule, ruleUpdate.value);
    }
  }

  async getCancellationPolicy(propertyId) {
    const rules = await this.propertyRuleRepository.getRulesByPropertyId(propertyId);
    if (!rules || rules.length === 0) return null;

    const policyRule = rules?.find((r) => r?.rule?.startsWith("CancellationPolicy:"));
    if (policyRule) {
      return { policy_type: policyRule.rule.replace("CancellationPolicy:", ""), property_id: propertyId };
    }
    return null;
  }

  async updateCancellationPolicy(propertyId, policyType) {
    if (!policyType) return;

    const ruleName = `CancellationPolicy:${policyType}`;
    await this.#upsertPropertyRule(propertyId, ruleName, true);
  }

  async getLateCheckin(propertyId) {
    const rules = await this.propertyRuleRepository.getRulesByPropertyId(propertyId);
    if (!rules || rules.length === 0) return null;

    const lateCheckinEnabled = rules.find((r) => r.rule === "LateCheckinEnabled");
    const lateCheckinTime = rules.find((r) => r.rule === "LateCheckinTime");
    const lateCheckoutEnabled = rules.find((r) => r.rule === "LateCheckoutEnabled");
    const lateCheckoutTime = rules.find((r) => r.rule === "LateCheckoutTime");

    if (lateCheckinEnabled || lateCheckinTime || lateCheckoutEnabled || lateCheckoutTime) {
      return {
        property_id: propertyId,
        late_checkin_enabled: lateCheckinEnabled?.value === true,
        late_checkin_time: lateCheckinTime?.value || "18:00:00",
        late_checkout_enabled: lateCheckoutEnabled?.value === true,
        late_checkout_time: lateCheckoutTime?.value || "10:00:00",
      };
    }
    return null;
  }

  async updateLateCheckin(propertyId, lateCheckinData) {
    if (!lateCheckinData || typeof lateCheckinData !== "object") return;

    const rulesToUpdate = [
      { rule: "LateCheckinEnabled", value: lateCheckinData.late_checkin_enabled === true },
      { rule: "LateCheckinTime", value: lateCheckinData.late_checkin_time || "18:00:00" },
      { rule: "LateCheckoutEnabled", value: lateCheckinData.late_checkout_enabled === true },
      { rule: "LateCheckoutTime", value: lateCheckinData.late_checkout_time || "10:00:00" },
    ];

    for (const ruleUpdate of rulesToUpdate) {
      await this.#upsertPropertyRule(propertyId, ruleUpdate.rule, ruleUpdate.value);
    }
  }

  async getHouseRules(propertyId) {
    const rules = await this.propertyRuleRepository.getRulesByPropertyId(propertyId);
    if (!rules || rules.length === 0) return {};

    const houseRuleNames = [
      "ChildrenAllowed",
      "SmokingAllowed",
      "PetsAllowed",
      "PartiesEventsAllowed",
      "QuietHoursStart",
    ];
    const houseRuleObj = {};

    for (const ruleName of houseRuleNames) {
      const rule = rules?.find((r) => r?.rule === ruleName);
      houseRuleObj[ruleName] = rule?.value === true;
    }

    return houseRuleObj;
  }

  async updateHouseRules(propertyId, houseRules) {
    if (!houseRules || typeof houseRules !== "object") return;

    const houseRuleNames = [
      "ChildrenAllowed",
      "SmokingAllowed",
      "PetsAllowed",
      "PartiesEventsAllowed",
      "QuietHoursStart",
    ];

    for (const ruleName of houseRuleNames) {
      const isEnabled = (houseRules?.[ruleName] ?? false) === true;
      await this.#upsertPropertyRule(propertyId, ruleName, isEnabled);
    }
  }

  async getCustomRules(propertyId) {
    return [];
  }

  async updateCustomRules(propertyId, customRules) {
    // Custom rules storage to be implemented
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
