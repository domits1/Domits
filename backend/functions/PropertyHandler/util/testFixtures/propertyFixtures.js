/**
 * Test fixtures for PropertyHandler in TEST mode.
 * These fixtures provide deterministic data to avoid AWS calls during testing.
 */

import { isTestMode } from "../../../../util/isTestMode.js";

// Deterministic test IDs
export const TEST_HOST_ID = "test-host-id-12345";
export const TEST_GUEST_ID = "test-guest-id-67890";
export const TEST_PROPERTY_ID = "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5";

/**
 * Get the test property ID used in tests
 */
export function getTestPropertyId() {
    return TEST_PROPERTY_ID;
}

/**
 * Get the test host ID
 */
export function getTestHostId() {
    return TEST_HOST_ID;
}

/**
 * Get the test guest ID
 */
export function getTestGuestId() {
    return TEST_GUEST_ID;
}

/**
 * Active property card fixture (for getActivePropertyCards, getActivePropertyCardById)
 */
export const ACTIVE_PROPERTY_CARD = {
    property: {
        id: TEST_PROPERTY_ID,
        host_id: TEST_HOST_ID,
        status: "ACTIVE",
        name: "Test Property",
        description: "A test property for unit testing",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
    },
    propertyGeneralDetails: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        guests: 4,
        bedrooms: 2,
        bathrooms: 1,
        detail: "Test general details"
    },
    propertyPricing: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        price_per_night: 100,
        currency: "EUR",
        cleaning_fee: 50,
        service_fee: 20
    },
    propertyImages: [
        {
            id: "img-1",
            property_id: TEST_PROPERTY_ID,
            url: "https://example.com/image1.jpg",
            is_primary: true
        }
    ],
    propertyLocation: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        address: "123 Test Street",
        city: "Test City",
        country: "Test Country",
        latitude: 40.7128,
        longitude: -74.0060
    },
    propertyTestStatus: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        status: "active"
    }
};

/**
 * Full active property fixture (for getFullActivePropertyById)
 */
export const FULL_ACTIVE_PROPERTY = {
    property: {
        id: TEST_PROPERTY_ID,
        host_id: TEST_HOST_ID,
        status: "ACTIVE",
        name: "Test Property",
        description: "A test property for unit testing",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z"
    },
    amenities: [
        {
            id: "amenity-1",
            property_id: TEST_PROPERTY_ID,
            amenityId: "wifi",
            name: "WiFi"
        }
    ],
    availability: {
        id: "avail-1",
        property_id: TEST_PROPERTY_ID,
        start_date: "2024-01-01",
        end_date: "2024-12-31",
        booked_dates: []
    },
    availabilityRestrictions: [],
    checkIn: {
        id: "checkin-1",
        property_id: TEST_PROPERTY_ID,
        timeslot: "15:00"
    },
    generalDetails: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        guests: 4,
        bedrooms: 2,
        bathrooms: 1,
        detail: "Test general details"
    },
    images: [
        {
            id: "img-1",
            property_id: TEST_PROPERTY_ID,
            url: "https://example.com/image1.jpg",
            is_primary: true
        }
    ],
    location: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        address: "123 Test Street",
        city: "Test City",
        country: "Test Country",
        latitude: 40.7128,
        longitude: -74.0060
    },
    pricing: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        price_per_night: 100,
        currency: "EUR",
        cleaning_fee: 50,
        service_fee: 20
    },
    rules: [
        {
            id: "rule-1",
            property_id: TEST_PROPERTY_ID,
            rule: "No smoking"
        }
    ],
    propertyType: {
        id: "type-1",
        property_id: TEST_PROPERTY_ID,
        property_type: "Apartment"
    },
    technicalDetails: null,
    propertyTestStatus: {
        id: TEST_PROPERTY_ID,
        property_id: TEST_PROPERTY_ID,
        status: "active"
    }
};

/**
 * Properties by host fixture (for getFullPropertiesByHostId)
 */
export const PROPERTIES_BY_HOST = [
    {
        property: {
            id: TEST_PROPERTY_ID,
            host_id: TEST_HOST_ID,
            status: "ACTIVE",
            name: "Test Property",
            description: "A test property for unit testing",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z"
        },
        amenities: [],
        availability: {},
        availabilityRestrictions: [],
        checkIn: {},
        generalDetails: {},
        images: [],
        location: {},
        pricing: {},
        rules: [],
        propertyType: {},
        technicalDetails: null,
        propertyTestStatus: {}
    }
];

/**
 * Get property card fixture (used by getActivePropertyCards, getActivePropertyCardById)
 */
export function getPropertyCardFixture(propertyId = TEST_PROPERTY_ID) {
    if (!isTestMode()) {
        throw new Error("getPropertyCardFixture can only be used in TEST mode");
    }
    return {
        ...ACTIVE_PROPERTY_CARD,
        property: { ...ACTIVE_PROPERTY_CARD.property, id: propertyId }
    };
}

/**
 * Get full property fixture (used by getFullActivePropertyById)
 */
export function getFullPropertyFixture(propertyId = TEST_PROPERTY_ID) {
    if (!isTestMode()) {
        throw new Error("getFullPropertyFixture can only be used in TEST mode");
    }
    return {
        ...FULL_ACTIVE_PROPERTY,
        property: { ...FULL_ACTIVE_PROPERTY.property, id: propertyId }
    };
}

/**
 * Get properties by host fixture (used by getFullPropertiesByHostId)
 */
export function getPropertiesByHostFixture(hostId = TEST_HOST_ID) {
    if (!isTestMode()) {
        throw new Error("getPropertiesByHostFixture can only be used in TEST mode");
    }
    return PROPERTIES_BY_HOST.map(p => ({
        ...p,
        property: { ...p.property, host_id: hostId }
    }));
}
