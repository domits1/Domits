const propertyFormDataTemplate = {
    property: {
        id: "",
        hostId: "aab76a75-d16f-4960-a261-63d5ee41dce6",
        title: "",
        subtitle: "",
        description: "",
        guestCapacity: "", //Number
        registrationNumber: "",
        status: "",
        createdAt: 0,
        updatedAt: 0
    },
    propertyAmenities: [

    ],
    propertyAvailability: [
      //fixme hard-coded dates
        {
            "availableStartDate": 1786185200000,
            "availableEndDate": 1808863600000
        },
        {
            "availableStartDate": 1774316000000,
            "availableEndDate": 1781801200000
        }
    ],
    propertyCheckIn: {
        checkIn: {
            from: "00:00",
            till: "00:00",
        },
        checkOut: {
            from: "00:00",
            till: "00:00",
        }
    },
    propertyGeneralDetails: [
        {
            detail: "Guests",
            value: 0,
        },
        {
            detail: "Beds",
            value: 0,
        },
        {
            detail: "Bedrooms",
            value: 0,
        },
        {
            detail: "Bathrooms",
            value: 0,
        },
    ],
    propertyLocation: {
        country: "",
        city: "",
        street: "",
        houseNumber: "", //Number
        houseNumberExtension: "",
        postalCode: ""
    },
    propertyPricing: {
        roomRate: 2,
        cleaning: 0,
    },
    propertyRules: [
        {rule: "PetsAllowed", value: false},
        {rule: "SmokingAllowed", value: false},
        {rule: "Parties/EventsAllowed", value: false},
    ],
    propertyType: {
        property_type: "",
        spaceType: ""
    },
    propertyImages: [

    ],
    propertyTechnicalDetails: {
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

export default propertyFormDataTemplate;
