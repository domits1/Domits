class PropertyDTO {
    constructor(data) {
        this.hostId = data.hostId;
        this.title = data.title;
        this.subtitle = data.subtitle;
        this.description = data.description;
        this.guestCapacity = data.guestCapacity;
        this.registrationNumber = data.registrationNumber;
        this.status = data.status;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;

        this.amenities = data.propertyAmenities?.map(amenity => new PropertyAmenitiesDTO(amenity)) || [];
        this.availability = data.propertyAvailability?.map(avail => new PropertyAvailabilityDTO(avail)) || [];
        this.availabilityRestrictions = data.propertyAvailabilityRestrictions?.map(restriction => new PropertyAvailabilityRestrictionsDTO(restriction)) || [];
        this.checkIn = new PropertyCheckInDTO(data.propertyCheckIn);
        this.generalDetails = data.propertyGeneralDetails?.map(detail => new PropertyGeneralDetailsDTO(detail)) || [];
        this.location = new PropertyLocationDTO(data.propertyLocation);
        this.pricing = new PropertyPricingDTO(data.propertyPricing);
        this.rules = data.propertyRules?.map(rule => new PropertyRulesDTO(rule)) || [];
        this.type = new PropertyTypeDTO(data.propertyType);
        this.images = data.propertyImages?.map(image => new PropertyImagesDTO(image)) || [];
        this.technicalDetails = new PropertyTechnicalDetailsDTO(data.propertyTechnicalDetails);
    }
}

class PropertyAmenitiesDTO {
    constructor(data) {
        this.amenityId = data.amenityId;
    }
}

class PropertyAvailabilityDTO {
    constructor(data) {
        this.availableStartDate = data.availableStartDate;
        this.availableEndDate = data.availableEndDate;
    }
}

class PropertyAvailabilityRestrictionsDTO {
    constructor(data) {
        this.restriction = data.restriction;
        this.value = data.value;
    }
}

class PropertyCheckInDTO {
    constructor(data) {
        this.checkIn = {
            from: data.checkIn.from,
            till: data.checkIn.till
        };
        this.checkOut = {
            from: data.checkOut.from,
            till: data.checkOut.till
        };
    }
}

class PropertyGeneralDetailsDTO {
    constructor(data) {
        this.detail = data.detail;
        this.value = data.value;
    }
}

class PropertyLocationDTO {
    constructor(data) {
        this.country = data.country;
        this.city = data.city;
        this.street = data.street;
        this.houseNumber = data.houseNumber;
        this.houseNumberExtension = data.houseNumberExtension;
        this.postalCode = data.postalCode;
    }
}

class PropertyPricingDTO {
    constructor(data) {
        this.roomRate = data.roomRate;
        this.cleaning = data.cleaning;
        this.service = data.service;
    }
}

class PropertyRulesDTO {
    constructor(data) {
        this.rule = data.rule;
        this.value = data.value;
    }
}

class PropertyTypeDTO {
    constructor(data) {
        this.propertyType = data.property_type;
        this.spaceType = data.spaceType;
    }
}

class PropertyImagesDTO {
    constructor(data) {
        this.key = data.key;
    }
}

class PropertyTechnicalDetailsDTO {
    constructor(data) {
        this.length = data.length;
        this.height = data.height;
        this.fuelConsumption = data.fuelConsumption;
        this.speed = data.speed;
        this.renovationYear = data.renovationYear;
        this.transmission = data.transmission;
        this.generalPeriodicInspection = data.generalPeriodicInspection;
        this.fourWheelDrive = data.fourWheelDrive;
    }
}

export { 
    PropertyDTO,
    PropertyAmenitiesDTO,
    PropertyAvailabilityDTO,
    PropertyAvailabilityRestrictionsDTO,
    PropertyCheckInDTO,
    PropertyGeneralDetailsDTO,
    PropertyLocationDTO,
    PropertyPricingDTO,
    PropertyRulesDTO,
    PropertyTypeDTO,
    PropertyImagesDTO,
    PropertyTechnicalDetailsDTO
};
