import { SystemManagerRepository } from "../../data/repository/systemManagerRepository.js";

import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { TypeException } from "../../util/exception/TypeException.js";

import { randomUUID } from "crypto";

import { PropertyAmenityRepository } from "../../data/repository/propertyAmenityRepository.js";
import { PropertyAvailabilityRestrictionRepository } from "../../data/repository/propertyAvailabilityRestrictionRepository.js";
import { PropertyGeneralDetailRepository } from "../../data/repository/propertyGeneralDetailRepository.js";
import { PropertyRuleRepository } from "../../data/repository/propertyRuleRepository.js";
import { PropertyTypeRepository } from "../../data/repository/propertyTypeRepository.js";

import { PropertyAmenity } from "../model/propertyAmenity.js";
import { PropertyAvailability } from "../model/propertyAvailability.js";
import { PropertyAvailabilityRestriction } from "../model/propertyAvailabilityRestriction.js";
import { PropertyCheckIn } from "../model/propertyCheckIn.js";
import { PropertyGeneralDetail } from "../model/propertyGeneralDetail.js";
import { PropertyLocation } from "../model/propertyLocation.js";
import { PropertyBaseDetails } from "../model/propertyBaseDetails.js";
import { PropertyPricing } from "../model/propertyPricing.js";
import { PropertyRule } from "../model/propertyRule.js";
import { PropertyTechnicalDetails } from "../model/propertyTechnicalDetails.js";
import { PropertyType } from "../model/propertyType.js";
import { PropertyImage } from "../model/propertyImage.js";
import { PropertyTestStatus } from "../model/propertyTestStatus.js";

export class PropertyBuilder {
  constructor(systemManagerRepository = new SystemManagerRepository()) {
    this.propertyAmenityRepository = new PropertyAmenityRepository(systemManagerRepository);
    this.propertyAvailabilityRestrictionRepository = new PropertyAvailabilityRestrictionRepository(
      systemManagerRepository
    );
    this.propertyGeneralDetailRepository = new PropertyGeneralDetailRepository(systemManagerRepository);
    this.propertyRuleRepository = new PropertyRuleRepository(systemManagerRepository);
    this.propertyTypeRepository = new PropertyTypeRepository(systemManagerRepository);
  }

  async addBasePropertyInfo(requestParams, propertyType, userId) {
    let propertyParams = requestParams;
    propertyParams.id = randomUUID();
    propertyParams.hostId = userId;
    propertyParams.createdAt = Date.now();
    propertyParams.status = "INACTIVE";
    if (!(await this.propertyTypeRepository.getPropertyTypeById(propertyType))) {
      throw new NotFoundException("Property type not found.");
    }
    propertyParams.propertyType = propertyType;
    this.property = new PropertyBaseDetails(propertyParams);
    return this;
  }

  async addAmenities(amenities) {
    let amenityArray = [];
    for (const amenity of amenities) {
      const amenityExists = await this.propertyAmenityRepository.getAmenityAndCategoryById(amenity.amenityId);
      if (!amenityExists) {
        throw new Error(`Amenity not found.`);
      }
      amenityArray.push(new PropertyAmenity(randomUUID(), this.property.id, amenity.amenityId));
    }
    this.propertyAmenities = amenityArray;
    return this;
  }

  addAvailability(availabilities) {
    let availabilityArray = [];
    for (const availability of availabilities) {
      if (availability.availableStartDate < Date.now()) {
        throw new Error("Available start date can not be in the past.");
      }
      if (availability.availableEndDate < Date.now()) {
        throw new Error("Available end date can not be in the past.");
      }
      if (availability.availableStartDate > availability.availableEndDate) {
        throw new Error("Available end date can not be before available start date");
      }
      availabilityArray.push(
        new PropertyAvailability(this.property.id, availability.availableStartDate, availability.availableEndDate)
      );
    }
    this.propertyAvailabilities = availabilityArray;
    return this;
  }

  async addAvailabilityRestrictions(restriction) {
    let restrictionArray = [];
    const restrictionExists = await this.propertyAvailabilityRestrictionRepository.getAvailabilityRestrictionById(
      restriction.restriction
    );
    if (!restrictionExists) {
      throw new Error("Restriction not found.");
    }
    restrictionArray.push(
      new PropertyAvailabilityRestriction(randomUUID(), this.property.id, restriction.restriction, restriction.value)
    );
    this.propertyAvailabilityRestrictions = restrictionArray;
    return this;
  }

  addCheckIn(params) {
    let propertyCheckInParams = params;
    if (params.checkIn.from > params.checkIn.till) {
      throw new Error("Check-in timeslot is incorrect.");
    }
    if (params.checkOut.from > params.checkOut.till) {
      throw new Error("Check-out timeslot is incorrect.");
    }
    this.propertyCheckIn = new PropertyCheckIn(
      this.property.id,
      propertyCheckInParams.checkIn,
      propertyCheckInParams.checkOut
    );
    return this;
  }

  async addGeneralDetails(details) {
    let detailArray = [];
    for (const detail of details) {
      const detailExists = await this.propertyGeneralDetailRepository.getGeneralDetailById(detail.detail);
      if (!detailExists) {
        throw new Error("Detail not found.");
      }
      detailArray.push(new PropertyGeneralDetail(randomUUID(), this.property.id, detail.detail, detail.value));
    }
    this.propertyGeneralDetails = detailArray;
    return this;
  }

  addLocation(params) {
    const location = new PropertyLocation(
      this.property.id,
      params.country,
      params.city,
      params.street,
      params.houseNumber,
      params.houseNumberExtension,
      params.postalCode
    );
    Object.keys(location).forEach((item) => {
      if (item !== "houseNumberExtension") {
        if (!location[item]) {
          throw new Error(`Missing ${item}.`);
        }
      }
    });
    this.propertyLocation = location;
    return this;
  }

  addPricing(params) {
    this.propertyPricing = new PropertyPricing(this.property.id, params.roomRate, params.cleaning);
    return this;
  }

  async addRules(rules) {
    const ruleArray = [];
    for (const rule of rules) {
      const ruleExists = await this.propertyRuleRepository.getRuleById(rule.rule);
      if (!ruleExists) {
        throw new Error("Rule not found.");
      }
      ruleArray.push(new PropertyRule(this.property.id, rule.rule, rule.value));
    }
    this.propertyRules = ruleArray;
    return this;
  }

  addPropertyType(params) {
    params.property_id = this.property.id;
    this.propertyType = new PropertyType(params);
    return this;
  }

  addPropertyTestStatus(params) {
    const testStatus = new PropertyTestStatus(this.property.id, params.isTest);
    this.propertyTestStatus = testStatus;
    return this;
  }

  addImages(images) {
    if (images.length < 5) {
      throw new TypeException("Minimum of 5 images required.");
    } else if (images.length > 30) {
      throw new TypeException("Maximum of 30 images allowed.");
    }
    const imageArray = [];
    for (const image of images) {
      imageArray.push(new PropertyImage(this.property.id, image.key, image.image));
    }
    this.propertyImages = imageArray;
    return this;
  }

  addTechnicalDetails(params) {
    const technicalDetails = new PropertyTechnicalDetails(params);
    technicalDetails.property_id = this.property.id;
    Object.keys(technicalDetails).forEach((item) => {
      if (!technicalDetails[item]) {
        throw new Error(`Missing ${item}.`);
      }
    });
    this.propertyTechnicalDetails = technicalDetails;
    return this;
  }

  build() {
    return this;
  }
}
