const propertyFormData = {
    property: {
        id: "String",
        hostId: "String",
        title: "String",
        subtitle: "String",
        description: "String",
        guestCapacity: -1,
        registrationNumber: "String",
        status: "String",
        createdAt: -1,
        updatedAt: -1
    },
    propertyAmenities: [
        {
            id: "String",
            property_id: "String",
            amenityId: "String"
        }
    ],
    propertyAvailability: [
        {
            property_id: "String",
            availableStartDate: -1,
            availableEndDate: -1
        }
    ],
    propertyCheckIn: {
        property_id: "String",
        checkIn: {
            from: -1,
            till: -1
        },
        checkOut: {
            from: -1,
            till: -1
        }
    },
    propertyGeneralDetails: [
        {
            id: "String",
            property_id: "String",
            detail: "String",
            value: -1
        }
    ],
    propertyLocation: {
        property_id: "String",
        country: "String",
        city: "String",
        street: "String",
        houseNumber: -1,
        houseNumberExtension: "String",
        postalCode: "String"
    },
    propertyPricing: {
        property_id: "String",
        roomRate: -1,
        cleaning: -1,
    },
    propertyRules: [
        {
            property_id: "String",
            rule: "String",
            value: null
        }
    ],
    propertyType: {
        property_id: "String",
        property_type: "String",
        spaceType: "String"
    },
    propertyImages: [
        {
            property_id: "String",
            key: "String",
            image: "String"
        }
    ],
    propertyTechnicalDetails: {
        property_id: "String",
        length: -1,
        height: -1,
        fuelConsumption: -1,
        speed: -1,
        renovationYear: -1,
        transmission: "String",
        generalPeriodicInspection: -1,
        fourWheelDrive: null
    }
};

export default propertyFormData;
