import React, { useMemo, useState, useEffect } from "react";
import "./HostCalendar.scss";

import Toolbar from "./components/Toolbar";
import Legend from "./components/Legend";
import CalendarGrid from "./components/CalendarGrid";
import StatsPanel from "./components/StatsPanel";

import AvailabilityCard from "./components/Sidebar/AvailabilityCard";
import PricingCard from "./components/Sidebar/PricingCard";
import ExternalCalendarsCard from "./components/Sidebar/ExternalCalendarsCard";

import { getMonthMatrix, startOfMonthUTC, addMonthsUTC, subMonthsUTC } from "./utils/date";
import { calendarService } from "../hostcalendar/services/calendarService";
import { getAccessToken } from "../../../services/getAccessToken";

const initialBlocks = {
  booked: new Set(),
  available: new Set(),
  blocked: new Set(),
  maintenance: new Set(),
};
const initialPrices = {};

export default function HostCalendar() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));
  const [selections, setSelections] = useState(initialBlocks);
  const [prices, setPrices] = useState(initialPrices);
  const [tempPrice, setTempPrice] = useState("");

  // New state for API data
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  // Load pricing from localStorage on mount
  useEffect(() => {
    if (selectedProperty) {
      const savedPricing = localStorage.getItem(`calendar_pricing_${selectedProperty}`);
      if (savedPricing) {
        try {
          setPrices(JSON.parse(savedPricing));
        } catch (e) {
          // Invalid JSON, ignore
        }
      }
    }
  }, [selectedProperty]);

  // Save pricing to localStorage whenever it changes
  useEffect(() => {
    if (selectedProperty && Object.keys(prices).length > 0) {
      localStorage.setItem(`calendar_pricing_${selectedProperty}`, JSON.stringify(prices));
    }
  }, [prices, selectedProperty]);

  // Fetch property list on component mount
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = getAccessToken();

        if (!token) {
          setError("Not authenticated. Please log in.");
          alert("⚠️ No authentication token found. Please log in first.");
          return;
        }

        const response = await fetch(
          "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
          {
            method: "GET",
            headers: {
              Authorization: token,
            },
          }
        );

        if (!response.ok) {
          const errorMsg = `Failed to fetch properties: ${response.status} ${response.statusText}`;
          setError(errorMsg);
          alert(`❌ API Error: ${errorMsg}`);
          return;
        }

        const data = await response.json();
        const propertyList = Array.isArray(data) ? data : [];
        setProperties(propertyList);

        if (propertyList.length > 0) {
          const firstPropertyId = propertyList[0].ID || propertyList[0].id;
          setSelectedProperty(firstPropertyId);
          alert(`✅ Loaded ${propertyList.length} properties. First property: ${propertyList[0].Title || firstPropertyId}`);
        } else {
          alert("⚠️ No properties found. Please create a property first.");
        }
      } catch (err) {
        setError(err.message);
        alert(`❌ Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Fetch property details, bookings, and pricing when property is selected
  useEffect(() => {
    if (!selectedProperty) return;

    const fetchPropertyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch property details
        const details = await calendarService.fetchPropertyDetails(selectedProperty);
        setPropertyDetails(details);

        // Fetch bookings
        const bookingsData = await calendarService.fetchPropertyBookings(selectedProperty);
        setBookings(bookingsData);

        alert(`📊 Data loaded:\n- Property ID: ${selectedProperty}\n- Bookings found: ${bookingsData.length}\n- Property: ${details?.Title || 'Unknown'}`);

        // Load saved calendar data
        const savedData = await calendarService.loadCalendarData(selectedProperty);

        const bookedSet = new Set();

        bookingsData.forEach((booking) => {
          const arrivalDate = booking.arrivaldate
            ? typeof booking.arrivaldate === 'number'
              ? new Date(booking.arrivaldate)
              : new Date(booking.arrivaldate)
            : null;

          const departureDate = booking.departuredate
            ? typeof booking.departuredate === 'number'
              ? new Date(booking.departuredate)
              : new Date(booking.departuredate)
            : null;

          if (arrivalDate && departureDate && !isNaN(arrivalDate) && !isNaN(departureDate)) {
            const currentDate = new Date(arrivalDate);
            while (currentDate <= departureDate) {
              const dateKey = currentDate.toISOString().split("T")[0];
              bookedSet.add(dateKey);
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        });

        const blockedSet = new Set(savedData.blocked || []);
        const maintenanceSet = new Set(savedData.maintenance || []);

        setSelections({
          booked: bookedSet,
          available: new Set(),
          blocked: blockedSet,
          maintenance: maintenanceSet,
        });

        alert(`📅 Calendar updated:\n- Booked dates: ${bookedSet.size}\n- Blocked dates: ${blockedSet.size}\n- Maintenance dates: ${maintenanceSet.size}`);

        const pricingData = {};

        if (savedData.prices) {
          Object.assign(pricingData, savedData.prices);
        }

        setPrices(pricingData);
      } catch (err) {
        setError(err.message);
        alert(`❌ Error loading property data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, [selectedProperty]);

  const toggleDayIn = (bucket, key) => {
    // Don't allow toggling booked dates
    if (selections.booked.has(key) && bucket !== "booked") {
      alert("Cannot modify booked dates. This date is already booked.");
      return;
    }

    setSelections((prev) => {
      const next = { ...prev, [bucket]: new Set(prev[bucket]) };
      if (next[bucket].has(key)) next[bucket].delete(key);
      else next[bucket].add(key);

      Object.keys(prev).forEach((b) => {
        if (b !== bucket) next[b] = new Set([...next[b]].filter((k) => k !== key));
      });
      return next;
    });
  };

  const setPriceForSelection = () => {
    const value = parseFloat(tempPrice);
    if (Number.isNaN(value)) return;
    setPrices((prev) => {
      const next = { ...prev };
      selections.available.forEach((k) => (next[k] = value));
      selections.booked.forEach((k) => (next[k] = value));
      selections.blocked.forEach((k) => (next[k] = value));
      selections.maintenance.forEach((k) => (next[k] = value));
      return next;
    });
    setTempPrice("");
  };

  const handleSaveChanges = async () => {
    if (!selectedProperty) {
      alert("No property selected");
      return;
    }

    try {
      setLoading(true);

      await calendarService.saveCalendarChanges(selectedProperty, {
        availability: {
          blocked: Array.from(selections.blocked),
          maintenance: Array.from(selections.maintenance),
        },
        pricing: prices,
      });

      alert("Changes saved successfully!");
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hc-container">
      {/* Property Selector and Status */}
      <div className="hc-property-selector">
        <div className="property-select-wrapper">
          <label htmlFor="property-select">Select Property:</label>
          <select
            id="property-select"
            value={selectedProperty || ""}
            onChange={(e) => setSelectedProperty(e.target.value)}
            disabled={loading}
          >
            {properties.length === 0 && <option value="">No properties found</option>}
            {properties.map((property) => (
              <option key={property.ID || property.id} value={property.ID || property.id}>
                {property.Title || property.name || property.title || property.ID || property.id}
              </option>
            ))}
          </select>
        </div>

        <div className="calendar-actions">
          <button
            className="btn-save-changes"
            onClick={handleSaveChanges}
            disabled={loading || !selectedProperty}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {error && <div className="error-message">Error: {error}</div>}
        {loading && <div className="loading-indicator">Loading...</div>}
      </div>

      <div className="hc-header-row">
        <Toolbar
          view={view}
          setView={setView}
          cursor={cursor}
          onPrev={prev}
          onNext={next}
          onToday={today}
        />
      </div>

      <div className="hc-top-cards">
        <AvailabilityCard
          onBlock={() => {}}
          onMaintenance={() => {}}
          onUndo={() =>
            setSelections({
              ...initialBlocks,
              booked: selections.booked, // Keep booked dates
            })
          }
        />
        <PricingCard
          tempPrice={tempPrice}
          setTempPrice={setTempPrice}
          onSetPrice={setPriceForSelection}
        />
        <ExternalCalendarsCard />
      </div>

      <Legend />

      <CalendarGrid
        view={view}
        cursor={cursor}
        monthGrid={monthGrid}
        selections={selections}
        prices={prices}
        onToggle={(bucket, key) => toggleDayIn(bucket, key)}
        onDragSelect={(keys) =>
          setSelections((prev) => ({ ...prev, available: new Set(keys) }))
        }
      />

      <StatsPanel selections={selections} />

      {/* Booking Details Info */}
      {propertyDetails && (
        <div className="property-info">
          <h3>Property Details</h3>
          <p>Base Room Rate: €{propertyDetails.pricing?.roomrate || propertyDetails.Pricing?.RoomRate || "N/A"}</p>
          <p>Cleaning Fee: €{propertyDetails.pricing?.cleaning || propertyDetails.Pricing?.Cleaning || "N/A"}</p>
          <p>Total Bookings: {bookings.length}</p>
        </div>
      )}

      {/* Debug Info - Remove after testing */}
      {error && (
        <div style={{padding: '10px', background: '#ffebee', marginTop: '10px', borderRadius: '5px'}}>
          <strong>Error:</strong> {error}
        </div>
      )}
      {selectedProperty && bookings.length === 0 && !loading && (
        <div style={{padding: '10px', background: '#fff3e0', marginTop: '10px', borderRadius: '5px'}}>
          <strong>No bookings found for this property.</strong> Property ID: {selectedProperty}
        </div>
      )}
      {selectedProperty && bookings.length > 0 && (
        <div style={{padding: '10px', background: '#e8f5e9', marginTop: '10px', borderRadius: '5px'}}>
          <strong>✓ Found {bookings.length} booking(s)</strong>
          {bookings.map((b, i) => (
            <div key={i} style={{marginTop: '5px', fontSize: '12px'}}>
              Booking {i+1}: {b.guestname || 'Guest'} - Status: {b.status}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}