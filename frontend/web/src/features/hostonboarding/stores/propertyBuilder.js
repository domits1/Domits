import { PropertyModel } from "./models/propertyModel";
import { PropertyAmenity } from "./models/propertyAmenity";
import { PropertyAvailability } from "./models/propertyAvailability";
import { PropertyAvailabilityRestriction } from "./models/propertyAvailabilityRestriction";
import { PropertyCheckIn } from "./models/propertyCheckIn";
import { PropertyGeneralDetail } from "./models/propertyGeneralDetail";
import { PropertyLocation } from "./models/propertyLocation";
import { PropertyPricing } from "./models/propertyPricing";
import { PropertyRule } from "./models/propertyRule";
import { PropertyType } from "./models/propertyType";
import { PropertyImage } from "./models/propertyImage";
import { PropertyTechnicalDetails } from "./models/propertyTechnicalDetails";

export class PropertyBuilder {
  addProperty(property) {
    this.property = new PropertyModel(property);
    return this;
  }

  addAmenities(amenities) {
    this.propertyAmenities = amenities.map(
      (amenity) => new PropertyAmenity("", "", amenity.id),
    );
    return this;
  }

  addAvailability(availabilities) {
    this.propertyAvailability = availabilities.map(
      (availability) =>
        new PropertyAvailability(
          "",
          availability.availableStartDate,
          availability.availableEndDate,
        ),
    );
    return this;
  }

  addAvailabilityRestrictions(restrictions) {
    this.propertyAvailabilityRestrictions = restrictions.map(
      (restriction) =>
        new PropertyAvailabilityRestriction(
          "",
          "",
          restriction.restriction,
          restriction.value,
        ),
    );
    return this;
  }

  addCheckIn(checkIn) {
    this.propertyCheckIn = new PropertyCheckIn(
      "",
      checkIn.checkIn,
      checkIn.checkOut,
    );
    return this;
  }

  addGeneralDetails(details) {
    this.propertyGeneralDetails = details.map(
      (detail) =>
        new PropertyGeneralDetail("", "", detail.detail, detail.value),
    );
    return this;
  }

  addLocation(location) {
    this.propertyLocation = new PropertyLocation(
      "",
      location.country,
      location.city,
      location.street,
      location.houseNumber,
      location.houseNumberExtension,
      location.postalCode,
    );
    return this;
  }

  addPricing(pricing) {
    this.propertyPricing = new PropertyPricing(
      "",
      pricing.roomRate,
      pricing.cleaning,
      pricing.service,
    );
    return this;
  }

  addRules(rules) {
    this.propertyRules = rules.map(
      (rule) => new PropertyRule("", rule.rule, rule.value),
    );
    return this;
  }

  addPropertyType(type) {
    this.propertyType = new PropertyType({
      property_id: "",
      property_type: type.type,
      spaceType: type.spaceType,
    });
    return this;
  }

  addImages(images) {
    this.propertyImages = images.map(
      (image) => new PropertyImage("", "", image),
    );
    return this;
  }

  addTechnicalDetails(details) {
    this.propertyTechnicalDetails = new PropertyTechnicalDetails({
      property_id: "",
      length: details.length,
      height: details.height,
      fuelConsumption: details.fuelConsumption,
      speed: details.speed,
      renovationYear: details.renovationYear,
      transmission: details.transmission,
      generalPeriodicInspection: details.generalPeriodicInspection,
      fourWheelDrive: details.fourWheelDrive,
    });
    return this;
  }

  build() {
    return this;
  }
}
