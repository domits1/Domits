import { PropertyModel } from "./builder_temp/models/propertyModel";
import { PropertyAmenity } from "./builder_temp/models/propertyAmenity";
import { PropertyAvailability } from "./builder_temp/models/propertyAvailability";
import { PropertyAvailabilityRestriction } from "./builder_temp/models/propertyAvailabilityRestriction";
import { PropertyCheckIn } from "./builder_temp/models/propertyCheckIn";
import { PropertyGeneralDetail } from "./builder_temp/models/propertyGeneralDetail";
import { PropertyLocation } from "./builder_temp/models/propertyLocation";
import { PropertyPricing } from "./builder_temp/models/propertyPricing";
import { PropertyRule } from "./builder_temp/models/propertyRule";
import { PropertyType } from "./builder_temp/models/propertyType";
import { PropertyImage } from "./builder_temp/models/propertyImage";
import { PropertyTechnicalDetails } from "./builder_temp/models/propertyTechnicalDetails";

export class PropertyBuilder {
  addProperty(property) {
    this.property = new PropertyModel(property);
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

  addAmenities(amenities) {
    this.propertyAmenities = amenities.map(
      (amenity) => new PropertyAmenity("", "", amenity.id),
    );
    return this;
  }

  addAvailability(availabilities) {
    this.propertyAvailabilities = availabilities.map(
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

  addImages(images) {
    this.propertyImages = images.map(
      (image) => new PropertyImage("", image.key),
    );
    return this;
  }
  addTechnicalVehicleDetails(details) {
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
    return {
      property: this.property,
      propertyType: this.propertyType,
      amenities: this.propertyAmenities,
      availability: this.propertyAvailabilities,
      availabilityRestrictions: this.propertyAvailabilityRestrictions,
      checkIn: this.propertyCheckIn,
      generalDetails: this.propertyGeneralDetails,
      location: this.propertyLocation,
      pricing: this.propertyPricing,
      rules: this.propertyRules,
      images: this.propertyImages,
      technicalDetails: this.propertyTechnicalDetails,
    };
  }
}
