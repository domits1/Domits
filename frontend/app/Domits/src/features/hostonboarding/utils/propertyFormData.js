const propertyFormData = {
    property: {
        id: "",
        hostId: "",
        title: "",
        subtitle: "",
        description: "",
        guestCapacity: -1,
        registrationNumber: "",
        status: "",
        createdAt: -1,
        updatedAt: -1
    },
    propertyAmenities: [
        {
            id: "",
            property_id: "",
            amenityId: ""
        }
    ],
    propertyAvailability: [
        {
            property_id: "",
            availableStartDate: -1,
            availableEndDate: -1
        }
    ],
    propertyCheckIn: {
        property_id: "",
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
            id: "",
            property_id: "",
            detail: "",
            value: -1
        }
    ],
    propertyLocation: {
        property_id: "",
        country: "",
        city: "",
        street: "",
        houseNumber: -1,
        houseNumberExtension: "",
        postalCode: ""
    },
    propertyPricing: {
        property_id: "",
        roomRate: -1,
        cleaning: -1,
    },
    propertyRules: [
        {
            property_id: "",
            rule: "",
            value: null
        }
    ],
    propertyType: {
        property_id: "",
        property_type: "",
        spaceType: ""
    },
    propertyImages: [
        {
            property_id: "",
            key: "",
            image: ""
        }
    ],
    propertyTechnicalDetails: {
        property_id: "",
        length: -1,
        height: -1,
        fuelConsumption: -1,
        speed: -1,
        renovationYear: -1,
        transmission: "",
        generalPeriodicInspection: -1,
        fourWheelDrive: null
    }
};

export default propertyFormData;
