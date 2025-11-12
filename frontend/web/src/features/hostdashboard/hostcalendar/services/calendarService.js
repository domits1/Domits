import { getAccessToken } from "../utils/getAccessToken";

const PROPERTY_API = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
const BOOKING_API = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development";
const LOCAL_CALENDAR_API = "http://localhost:3001/api/calendar-data";

export const calendarService = {
  /**
   * Fetch single property details including availability and pricing
   */
  async fetchPropertyDetails(propertyId) {
    try {
      const token = getAccessToken();
      const url = `${PROPERTY_API}/property/hostDashboard/single?property=${propertyId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch property details: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetch all bookings for a property
   */
  async fetchPropertyBookings(propertyId) {
    try {
      const token = getAccessToken();
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

      // Filter by property_id
      const filteredData = bookingsArray.filter(booking => booking.property_id === propertyId);

      // Attach pricing data to the response for use in the calendar
      if (pricingData && filteredData.length > 0) {
        filteredData._pricing = pricingData;
      }

      return filteredData;
    } catch (error) {
      console.error("Error fetching property bookings:", error);
      return [];
    }
  },

  /**
   * Fetch all host bookings (for statistics across all properties)
   */
  async fetchHostBookings() {
    try {
      const token = getAccessToken();
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
   * Load saved calendar data from local server
   */
  async loadCalendarData(propertyId) {
    try {
      const response = await fetch(`${LOCAL_CALENDAR_API}/${propertyId}`, {
        method: "GET",
      });

      if (!response.ok) {
        return {
          blocked: [],
          maintenance: [],
          prices: {}
        };
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      return {
        blocked: [],
        maintenance: [],
        prices: {}
      };
    }
  },

  /**
   * Save blocked/maintenance dates to local server
   */
  async saveAvailabilityChanges(propertyId, blockedDates, maintenanceDates) {
    try {
      const response = await fetch(`${LOCAL_CALENDAR_API}/${propertyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blocked: blockedDates,
          maintenance: maintenanceDates,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save availability: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const fallbackKey = `calendar_availability_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify({ blockedDates, maintenanceDates }));

      return {
        success: false,
        message: "Saved to localStorage (local server not running)",
        data: { propertyId, blockedDates, maintenanceDates }
      };
    }
  },

  /**
   * Save per-day pricing to local server
   */
  async savePricingChanges(propertyId, pricesByDate) {
    try {
      const response = await fetch(`${LOCAL_CALENDAR_API}/${propertyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prices: pricesByDate,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save pricing: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      const fallbackKey = `calendar_pricing_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify(pricesByDate));

      return {
        success: false,
        message: "Saved to localStorage (local server not running)",
        data: { propertyId, pricesByDate }
      };
    }
  },

  /**
   * Save all calendar changes (combined operation)
   */
  async saveCalendarChanges(propertyId, changes) {
    try {
      const results = {
        availability: null,
        pricing: null,
      };

      if (changes.availability) {
        results.availability = await this.saveAvailabilityChanges(
          propertyId,
          changes.availability.blocked || [],
          changes.availability.maintenance || []
        );
      }

      if (changes.pricing && Object.keys(changes.pricing).length > 0) {
        results.pricing = await this.savePricingChanges(
          propertyId,
          changes.pricing
        );
      }

      return results;
    } catch (error) {
      throw error;
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
