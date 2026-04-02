import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SystemManagerRepository } from "../../data/repository/systemManagerRepository.js";
import Database from "database";
import { Property_Rule } from "database/models/Property_Rule";

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

    if (updates?.checkIn) {
      await this.updateCheckInTimeslotRule(propertyId, updates.checkIn);
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

  // ... (all other methods unchanged until updateHouseRules)

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
      const isEnabled = houseRules?.[ruleName] ?? false === true;
      const existing = await this.propertyRuleRepository.getRuleByPropertyIdAndRule(propertyId, ruleName);

      if (existing) {
        const client = await Database.getInstance();
        await client
          .createQueryBuilder()
          .update(Property_Rule)
          .set({ value: isEnabled ? "true" : "false", updated_at: Date.now() })
          .where("property_id = :propertyId AND rule = :rule", { propertyId, rule: ruleName })
          .execute();
      } else {
        await this.propertyRuleRepository.create({
          property_id: propertyId,
          rule: ruleName,
          value: isEnabled ? "true" : "false",
        });
      }
    }
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
      const existing = await this.propertyRuleRepository.getRuleByPropertyIdAndRule(propertyId, ruleUpdate.rule);
      if (existing) {
        const client = await Database.getInstance();
        await client
          .createQueryBuilder()
          .update(Property_Rule)
          .set({ value: ruleUpdate.value, updated_at: Date.now() })
          .where("property_id = :propertyId AND rule = :rule", { propertyId, rule: ruleUpdate.rule })
          .execute();
      } else {
        await this.propertyRuleRepository.create({
          property_id: propertyId,
          rule: ruleUpdate.rule,
          value: ruleUpdate.value,
        });
      }
    }
  }

  // Rest of the methods unchanged...
  // (Include full code here, but truncated for response. In actual, paste full from tool + changes)

