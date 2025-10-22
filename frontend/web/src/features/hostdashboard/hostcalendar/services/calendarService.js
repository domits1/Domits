import { getAccessToken } from "../utils/getAccessToken";
const PROPERTY_API = "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default";
const BOOKING_API = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development";
const LOCAL_CALENDAR_API = "http://localhost:3001/api/calendar-data";
export const calendarService = {
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
      console.error("Error fetching property details:", error);
      throw error;
    }
  },

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
        console.warn(`No bookings found for property: ${response.status}`);
        return [];
      }

      const data = await response.json();
      console.log("Booking data received:", data);
      const filteredData = Array.isArray(data)
        ? data.filter(booking => booking.property_id === propertyId)
        : [];

      console.log(`Filtered ${filteredData.length} bookings for property ${propertyId}`);
      return filteredData;
    } catch (error) {
      console.error("Error fetching property bookings:", error);
      return [];
    }
  },
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
        console.warn(`No bookings found: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching host bookings:", error);
      return [];
    }
  },
  async loadCalendarData(propertyId) {
    try {
      console.log("📖 Loading calendar data for property:", propertyId);

      const response = await fetch(`${LOCAL_CALENDAR_API}/${propertyId}`, {
        method: "GET",
      });

      if (!response.ok) {
        console.warn(`Failed to load calendar data: ${response.status}`);
        return {
          blocked: [],
          maintenance: [],
          prices: {}
        };
      }
      const result = await response.json();
      console.log("✅ Loaded calendar data:", result.data);
      return result.data;
    } catch (error) {
      console.error("Error loading calendar data:", error);
      return {
        blocked: [],
        maintenance: [],
        prices: {}
      };
    }
  },
  async saveAvailabilityChanges(propertyId, blockedDates, maintenanceDates) {
    console.log("=== SAVE AVAILABILITY ===");
    console.log("Property ID:", propertyId);
    console.log("Blocked dates:", blockedDates);
    console.log("Maintenance dates:", maintenanceDates);
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
      console.log("✅ Availability saved successfully:", result);
      return result;
    } catch (error) {
      console.error("Error saving availability:", error);
      const fallbackKey = `calendar_availability_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify({ blockedDates, maintenanceDates }));
      console.log("⚠️ Saved to localStorage as fallback");
      return {
        success: false,
        message: "Saved to localStorage (local server not running)",
        data: { propertyId, blockedDates, maintenanceDates }
      };
    }
  },
  async savePricingChanges(propertyId, pricesByDate) {
    console.log("=== SAVE PRICING ===");
    console.log("Property ID:", propertyId);
    console.log("Prices by date:", pricesByDate);
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
      console.log("✅ Pricing saved successfully:", result);
      return result;
    } catch (error) {
      console.error("Error saving pricing:", error);
      const fallbackKey = `calendar_pricing_${propertyId}`;
      localStorage.setItem(fallbackKey, JSON.stringify(pricesByDate));
      console.log("⚠️ Saved to localStorage as fallback");

      return {
        success: false,
        message: "Saved to localStorage (local server not running)",
        data: { propertyId, pricesByDate }
      };
    }
  },

  async saveCalendarChanges(propertyId, changes) {
    console.log("=== SAVING CALENDAR CHANGES ===");
    console.log("Property:", propertyId);
    console.log("Changes:", changes);
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

      console.log("=== SAVE COMPLETE ===");
      console.log("Results:", results);
      return results;
    } catch (error) {
      console.error("Error saving calendar changes:", error);
      throw error;
    }
  },
  dateToTimestamp(dateString) {
    return new Date(dateString).getTime();
  },
  timestampToDate(timestamp) {
    return new Date(timestamp).toISOString().split('T')[0];
  }
};
