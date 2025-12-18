import { getAccessToken } from "../utils/getAccessToken";

const PROPERTY_API = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
const BOOKING_API = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development";

/**
 * Professional Calendar Service
 * Handles all API communication for the host dashboard calendar
 * Uses PropertyHandler Lambda API for data persistence
 */
export const calendarService = {
  /**
   * Fetch single property details including availability and pricing
   * Endpoint: GET /property/hostDashboard/single?property={propertyId}
   * Returns: Full property object with nested availability, pricing, location, etc.
   */
  async fetchPropertyDetails(propertyId) {
    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Authentication token not found. Please log in.");
      }

      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      const url = `${PROPERTY_API}/property/hostDashboard/single?property=${propertyId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch property details (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch all bookings for a specific property
   * Endpoint: GET /bookings?readType=hostId&property_Id={propertyId}
   * Returns: Array of booking objects filtered by property_id
   * Response structure: { query: [...bookings], pricing: {...} }
   */
  async fetchPropertyBookings(propertyId) {
    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      if (!propertyId) {
        return [];
      }

      const url = `${BOOKING_API}/bookings?readType=hostId&property_Id=${propertyId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      // Handle the API response structure: { query: [...], pricing: {...} }
      let bookingsArray = [];
      let pricingData = null;

      if (data.query && Array.isArray(data.query)) {
        bookingsArray = data.query;

        // Extract pricing if available
        if (data.pricing && data.pricing.pricing && Array.isArray(data.pricing.pricing)) {
          const propertyPricing = data.pricing.pricing.find(p => p.property_id === propertyId);
          if (propertyPricing) {
            pricingData = propertyPricing;
          }
        }
      } else if (Array.isArray(data)) {
        bookingsArray = data;
      }

      // Filter by property_id to ensure we only get relevant bookings
      const filteredData = bookingsArray.filter(booking => booking.property_id === propertyId);

      // Attach pricing data to the response for use in the calendar
      if (pricingData && filteredData.length > 0) {
        filteredData._pricing = pricingData;
      }

      return filteredData;
    } catch (error) {
      return [];
    }
  },

  /**
   * Fetch all host bookings (for statistics across all properties)
   * Endpoint: GET /bookings?readType=hostId
   */
  async fetchHostBookings() {
    try {
      const token = getAccessToken();

      if (!token) {
        return [];
      }

      const url = `${BOOKING_API}/bookings?readType=hostId`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  },

  /**
   * Load saved calendar data from AWS PropertyHandler API
   * Endpoint: GET /property/hostDashboard/calendarData?property={propertyId}
   * Returns: { blocked: string[], maintenance: [{date, note}], prices: {date: price} }
   */
  async loadCalendarData(propertyId) {
    try {
      const token = getAccessToken();

      if (!token || !propertyId) {
        throw new Error("Missing authentication or property ID");
      }

      const url = `${PROPERTY_API}/property/hostDashboard/calendarData?property=${propertyId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          blocked: data.blocked || [],
          maintenance: data.maintenance || [],
          prices: data.pricing || {}
        };
      }

      throw new Error("API not available");
    } catch (error) {
      // Fallback to localStorage
      try {
        const availabilityKey = `calendar_availability_${propertyId}`;
        const pricingKey = `calendar_pricing_${propertyId}`;

        const availabilityData = localStorage.getItem(availabilityKey);
        const pricingData = localStorage.getItem(pricingKey);

        const result = {
          blocked: [],
          maintenance: [],
          prices: {}
        };

        if (availabilityData) {
          const parsed = JSON.parse(availabilityData);
          result.blocked = parsed.blockedDates || [];
          result.maintenance = parsed.maintenanceDates || [];
        }

        if (pricingData) {
          result.prices = JSON.parse(pricingData);
        }

        return result;
      } catch (localStorageError) {
        return {
          blocked: [],
          maintenance: [],
          prices: {}
        };
      }
    }
  },

  /**
   * Save blocked/maintenance dates to AWS PropertyHandler API
   * Endpoint: PUT /property/availability
   * Body: { propertyId: string, availability: { blocked: string[], maintenance: string[] } }
   * Backend will delete existing entries and create new ones (replace operation)
   */
  async saveAvailabilityChanges(propertyId, blockedDates, maintenanceDates) {
    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      // Validate input
      if (!Array.isArray(blockedDates)) {
        throw new Error("blockedDates must be an array");
      }
      if (!Array.isArray(maintenanceDates)) {
        throw new Error("maintenanceDates must be an array");
      }

      // Format maintenance dates properly (handle both string and object formats)
      const formattedMaintenanceDates = maintenanceDates.map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (typeof item === 'object' && item.date) {
          return item;
        }
        return null;
      }).filter(Boolean);

      const requestBody = {
        propertyId: propertyId,
        availability: {
          blocked: blockedDates,
          maintenance: formattedMaintenanceDates
        }
      };

      const response = await fetch(`${PROPERTY_API}/property/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Also save to localStorage as backup
      const fallbackKey = `calendar_availability_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify({
        blockedDates,
        maintenanceDates: formattedMaintenanceDates
      }));

      return {
        success: true,
        message: "Availability saved successfully to AWS database",
        data: result
      };
    } catch (error) {
      // Fallback to localStorage only
      const fallbackKey = `calendar_availability_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify({ blockedDates, maintenanceDates }));

      return {
        success: false,
        message: `Failed to save to AWS API: ${error.message}. Saved to localStorage as fallback.`,
        error: error.message,
        data: { propertyId, blockedDates, maintenanceDates }
      };
    }
  },

  /**
   * Save per-day custom pricing to AWS PropertyHandler API
   * Endpoint: PUT /property/pricing
   * Body: { propertyId: string, pricing: { "YYYY-MM-DD": price } }
   * Backend will delete existing custom pricing and create new entries (replace operation)
   */
  async savePricingChanges(propertyId, pricesByDate) {
    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      // Validate input
      if (typeof pricesByDate !== 'object' || pricesByDate === null) {
        throw new Error("pricesByDate must be an object");
      }

      // Validate all prices are numbers
      for (const [dateStr, price] of Object.entries(pricesByDate)) {
        if (typeof price !== 'number' || price < 0) {
          throw new Error(`Invalid price for date ${dateStr}: must be a positive number`);
        }
      }

      const requestBody = {
        propertyId: propertyId,
        pricing: pricesByDate
      };

      const response = await fetch(`${PROPERTY_API}/property/pricing`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Also save to localStorage as backup
      const fallbackKey = `calendar_pricing_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify(pricesByDate));

      return {
        success: true,
        message: "Pricing saved successfully to AWS database",
        data: result
      };
    } catch (error) {
      // Fallback to localStorage only
      const fallbackKey = `calendar_pricing_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify(pricesByDate));

      return {
        success: false,
        message: `Failed to save to AWS API: ${error.message}. Saved to localStorage as fallback.`,
        error: error.message,
        data: { propertyId, pricesByDate }
      };
    }
  },

  /**
   * Save all calendar changes (combined operation)
   * Uses PropertyHandler API endpoints:
   * - PUT /property/availability for blocked/maintenance dates
   * - PUT /property/pricing for custom prices
   */
  async saveCalendarChanges(propertyId, changes) {
    // Format maintenance dates upfront so it's available in catch block
    const formattedMaintenanceDates = (changes?.availability?.maintenance || []).map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (typeof item === 'object' && item.date) {
        return item;
      }
      return null;
    }).filter(Boolean);

    try {
      const token = getAccessToken();

      if (!token) {
        throw new Error("Authentication token not found");
      }

      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      const results = {};

      // Save availability if provided
      if (changes.availability) {
        const availabilityBody = {
          propertyId: propertyId,
          availability: {
            blocked: changes.availability.blocked || [],
            maintenance: formattedMaintenanceDates
          }
        };

        const availabilityResponse = await fetch(`${PROPERTY_API}/property/availability`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token,
          },
          body: JSON.stringify(availabilityBody),
        });

        if (!availabilityResponse.ok) {
          const errorText = await availabilityResponse.text();
          throw new Error(`Availability API Error ${availabilityResponse.status}: ${errorText}`);
        }

        results.availability = await availabilityResponse.json();
      }

      // Save pricing if provided
      if (changes.pricing && Object.keys(changes.pricing).length > 0) {
        const pricingBody = {
          propertyId: propertyId,
          pricing: changes.pricing
        };

        const pricingResponse = await fetch(`${PROPERTY_API}/property/pricing`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token,
          },
          body: JSON.stringify(pricingBody),
        });

        if (!pricingResponse.ok) {
          const errorText = await pricingResponse.text();
          throw new Error(`Pricing API Error ${pricingResponse.status}: ${errorText}`);
        }

        results.pricing = await pricingResponse.json();
      }

      // Save to localStorage as backup
      if (changes.availability) {
        localStorage.setItem(`calendar_availability_${propertyId}`, JSON.stringify({
          blockedDates: changes.availability.blocked || [],
          maintenanceDates: formattedMaintenanceDates
        }));
      }
      if (changes.pricing) {
        localStorage.setItem(`calendar_pricing_${propertyId}`, JSON.stringify(changes.pricing));
      }

      return {
        success: true,
        message: "Calendar data saved successfully to AWS database",
        data: results
      };
    } catch (error) {
      // Fallback to localStorage only
      if (changes.availability) {
        localStorage.setItem(`calendar_availability_${propertyId}`, JSON.stringify({
          blockedDates: changes.availability.blocked || [],
          maintenanceDates: formattedMaintenanceDates
        }));
      }

      if (changes.pricing) {
        localStorage.setItem(`calendar_pricing_${propertyId}`, JSON.stringify(changes.pricing));
      }

      return {
        success: false,
        message: `Failed to save: ${error.message}. Saved to localStorage as fallback.`,
        error: error.message,
        data: { propertyId, changes }
      };
    }
  },

  /**
   * Helper: Convert date string to timestamp for backend
   */
  dateToTimestamp(dateString) {
    return new Date(dateString).getTime();
  },

  /**
   * Helper: Convert timestamp to date string
   */
  timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }
};
