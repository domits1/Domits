import { getAccessToken } from "../utils/getAccessToken";
import { calendarApolloClient } from "../../../../config/apolloClient";
import { GET_CALENDAR_DATA } from "../../../../graphql/calendarQueries";
import { SAVE_CALENDAR_DATA } from "../../../../graphql/calendarMutations";

// Detect if running locally
const IS_LOCAL_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const PROPERTY_API = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
const BOOKING_API = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development";

// Use local server when in development, GraphQL in production
const USE_GRAPHQL = !IS_LOCAL_DEV;
const LOCAL_API = "http://localhost:3001/api/calendar-data";

/**
 * Professional Calendar Service
 * Handles all API communication for the host dashboard calendar
 * Implements proper error handling, validation, and fallback mechanisms
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
   * Load saved calendar data from GraphQL/REST API with localStorage fallback
   * Production: Uses GraphQL (AppSync)
   * Local: Uses REST (local server)
   * Returns: { blocked: string[], maintenance: [{date, note}], prices: {date: price} }
   */
  async loadCalendarData(propertyId) {
    try {
      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      // Use GraphQL in production, REST locally
      if (USE_GRAPHQL) {
        // Fetch from GraphQL
        const { data } = await calendarApolloClient.query({
          query: GET_CALENDAR_DATA,
          variables: { propertyId },
          fetchPolicy: 'network-only'
        });

        const calendarData = data.getCalendarData;

        // Convert GraphQL response to expected format
        const pricesObject = {};
        if (calendarData.prices) {
          calendarData.prices.forEach(({ date, price }) => {
            pricesObject[date] = price;
          });
        }

        return {
          blocked: calendarData.blockedDates || [],
          maintenance: calendarData.maintenanceDates || [],
          prices: pricesObject
        };
      } else {
        // Fetch from local REST API
        const url = `${LOCAL_API}/${propertyId}`;
        const response = await fetch(url);

        if (response.ok) {
          const responseData = await response.json();
          const data = responseData.data || responseData;
          return {
            blocked: data.blocked || [],
            maintenance: data.maintenance || [],
            prices: data.prices || {}
          };
        }

        throw new Error("Local API not available");
      }
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
   * Save blocked/maintenance dates to AWS backend API
   * Now uses new Dynamic Price API endpoint
   * Endpoint: POST /property/dynamic-price
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
          return item.date;
        }
        return null;
      }).filter(Boolean);

      const requestBody = {
        propertyId: propertyId,
        availability: {
          blocked: blockedDates,      // Array of date strings (YYYY-MM-DD)
          maintenance: formattedMaintenanceDates  // Array of date strings (YYYY-MM-DD)
        }
      };

      // Call the new Dynamic Price API endpoint
      const response = await fetch(DYNAMIC_PRICE_API, {
        method: "POST",
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
   * Save per-day custom pricing to AWS backend API
   * Now uses new Dynamic Price API endpoint
   * Endpoint: POST /property/dynamic-price
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
        pricing: pricesByDate  // Object: { "2024-12-25": 150, "2024-12-26": 200 }
      };

      // Call the new Dynamic Price API endpoint
      const response = await fetch(DYNAMIC_PRICE_API, {
        method: "POST",
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
   * Production: Uses GraphQL (AppSync)
   * Local: Uses REST (local server)
   * Body: { propertyId, availability: { blocked, maintenance }, pricing: {} }
   */
  async saveCalendarChanges(propertyId, changes) {
    try {
      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      // Format maintenance dates
      const formattedMaintenanceDates = (changes.availability?.maintenance || []).map(item => {
        if (typeof item === 'string') {
          return { date: item, note: '' };
        } else if (typeof item === 'object' && item.date) {
          return { date: item.date, note: item.note || '' };
        }
        return null;
      }).filter(Boolean);

      // Use GraphQL in production, REST locally
      if (USE_GRAPHQL) {
        // Convert pricing object to array for GraphQL
        const pricesArray = Object.entries(changes.pricing || {}).map(([date, price]) => ({
          date,
          price: parseInt(price)
        }));

        // Call GraphQL mutation
        const { data } = await calendarApolloClient.mutate({
          mutation: SAVE_CALENDAR_DATA,
          variables: {
            input: {
              propertyId,
              blockedDates: changes.availability?.blocked || [],
              maintenanceDates: formattedMaintenanceDates,
              prices: pricesArray
            }
          }
        });

        const result = data.saveCalendarData;

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
          success: result.success,
          message: result.message || "Calendar data saved to AWS GraphQL",
          data: result
        };
      } else {
        // Call local REST API
        const url = `${LOCAL_API}/${propertyId}`;
        const requestBody = {
          blocked: changes.availability?.blocked,
          maintenance: formattedMaintenanceDates,
          prices: changes.pricing
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Local API error: ${response.status}`);
        }

        const result = await response.json();

        return {
          success: result.success,
          message: "Calendar data saved to local server",
          data: result.data
        };
      }
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
