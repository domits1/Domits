import { getAccessToken } from "../utils/getAccessToken";

// Detect if running locally
const IS_LOCAL_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const PROPERTY_API = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
const BOOKING_API = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development";
const LOCAL_API = "http://localhost:3001/api/calendar-data";
export const calendarService = {
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
      let bookingsArray = [];
      let pricingData = null;

      if (data.query && Array.isArray(data.query)) {
        bookingsArray = data.query;
        if (data.pricing && data.pricing.pricing && Array.isArray(data.pricing.pricing)) {
          const propertyPricing = data.pricing.pricing.find(p => p.property_id === propertyId);
          if (propertyPricing) {
            pricingData = propertyPricing;
          }
        }
      } else if (Array.isArray(data)) {
        bookingsArray = data;
      }
      const filteredData = bookingsArray.filter(booking => booking.property_id === propertyId);
      if (pricingData && filteredData.length > 0) {
        filteredData._pricing = pricingData;
      }
      return filteredData;
    } catch (error) {
      return [];
    }
  },
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

  async loadCalendarData(propertyId) {
    try {
      const token = getAccessToken();

      if (!propertyId) {
        throw new Error("Property ID required");
      }
      if (IS_LOCAL_DEV) {
        const response = await fetch(`${LOCAL_API}?property=${propertyId}`, {
          method: "GET",
        });

        if (response.ok) {
          const data = await response.json();
          return {
            blocked: data.blocked || [],
            maintenance: data.maintenance || [],
            prices: data.pricing || {}
          };
        }
        throw new Error("Local server not available");
      }
      if (!token) {
        throw new Error("Authentication token not found");
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

  async saveAvailabilityChanges(propertyId, blockedDates, maintenanceDates) {
    try {
      const token = getAccessToken();

      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      if (!Array.isArray(blockedDates)) {
        throw new Error("blockedDates must be an array");
      }
      if (!Array.isArray(maintenanceDates)) {
        throw new Error("maintenanceDates must be an array");
      }
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
      if (IS_LOCAL_DEV) {
        const response = await fetch(LOCAL_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Local server error: ${response.status}`);
        }

        const result = await response.json();
        return {
          success: true,
          message: "Availability saved to local server",
          data: result
        };
      }
      if (!token) {
        throw new Error("Authentication token not found");
      }

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
      const fallbackKey = `calendar_availability_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify({ blockedDates, maintenanceDates }));

      return {
        success: false,
        message: `Failed to save: ${error.message}. Saved to localStorage.`,
        error: error.message,
        data: { propertyId, blockedDates, maintenanceDates }
      };
    }
  },

  async savePricingChanges(propertyId, pricesByDate) {
    try {
      const token = getAccessToken();

      if (!propertyId) {
        throw new Error("Property ID is required");
      }

      if (typeof pricesByDate !== 'object' || pricesByDate === null) {
        throw new Error("pricesByDate must be an object");
      }

      for (const [dateStr, price] of Object.entries(pricesByDate)) {
        if (typeof price !== 'number' || price < 0) {
          throw new Error(`Invalid price for date ${dateStr}: must be a positive number`);
        }
      }

      const requestBody = {
        propertyId: propertyId,
        pricing: pricesByDate
      };

      if (IS_LOCAL_DEV) {
        const response = await fetch(LOCAL_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Local server error: ${response.status}`);
        }

        const result = await response.json();
        return {
          success: true,
          message: "Pricing saved to local server",
          data: result
        };
      }
      if (!token) {
        throw new Error("Authentication token not found");
      }

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
      const fallbackKey = `calendar_pricing_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify(pricesByDate));

      return {
        success: true,
        message: "Pricing saved successfully to AWS database",
        data: result
      };
    } catch (error) {
      const fallbackKey = `calendar_pricing_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify(pricesByDate));

      return {
        success: false,
        message: `Failed to save: ${error.message}. Saved to localStorage.`,
        error: error.message,
        data: { propertyId, pricesByDate }
      };
    }
  },
  async saveCalendarChanges(propertyId, changes) {
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

      if (!propertyId) {
        throw new Error("Property ID is required");
      }
      if (IS_LOCAL_DEV) {
        const requestBody = {
          propertyId: propertyId
        };

        if (changes.availability) {
          requestBody.availability = {
            blocked: changes.availability.blocked || [],
            maintenance: formattedMaintenanceDates
          };
        }
        if (changes.pricing && Object.keys(changes.pricing).length > 0) {
          requestBody.pricing = changes.pricing;
        }
        const response = await fetch(LOCAL_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Local server error: ${response.status}`);
        }

        const result = await response.json();
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
          message: "Calendar data saved to local server (calendar-data.json)",
          data: result
        };
      }

      if (!token) {
        throw new Error("Authentication token not found");
      }
      const results = {};
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
        message: `Failed to save: ${error.message}. Saved to localStorage.`,
        error: error.message,
        data: { propertyId, changes }
      };
    }
  },

  dateToTimestamp(dateString) {
    return new Date(dateString).getTime();
  },

  timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }
};
