import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./HostCalendar.scss";

import Toolbar from "./components/Toolbar";
import Legend from "./components/Legend";
import CalendarGrid from "./components/CalendarGrid";
import StatsPanel from "./components/StatsPanel";
import MaintenanceModal from "./components/MaintenanceModal";

import AvailabilityCard from "./components/Sidebar/AvailabilityCard";
import PricingCard from "./components/Sidebar/PricingCard";
import ExternalCalendarsCard from "./components/Sidebar/ExternalCalendarsCard";

import { getMonthMatrix, startOfMonthUTC, addMonthsUTC, subMonthsUTC, toKey } from "./utils/date";
import { calendarService } from "./services/calendarService";

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
  const [bookingsByDate, setBookingsByDate] = useState({}); // Store booking info by date

  // New state for property selection and data
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({
    blocked: new Set(),
    maintenance: new Set(),
    prices: {}
  });
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState({}); // { "2025-01-15": "Plumbing repair" }

  // Debug modal state changes
  useEffect(() => {
    console.log('🎭 Modal state changed:', showMaintenanceModal);
  }, [showMaintenanceModal]);

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);

  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  // Jump to first available date
  const jumpToAvailability = () => {
    const availabilityData = propertyDetails?.propertyAvailability || propertyDetails?.availability;
    if (availabilityData && Array.isArray(availabilityData) && availabilityData.length > 0) {
      const firstAvail = availabilityData[0];
      if (firstAvail.availableStartDate) {
        const firstDate = new Date(firstAvail.availableStartDate);
        setCursor(startOfMonthUTC(firstDate));
      }
    }
  };

  // Process bookings and availability into calendar format
  const processBookingsIntoCalendar = useCallback((bookingData, details) => {
    const newSelections = {
      booked: new Set(),
      available: new Set(),
      blocked: new Set(),
      maintenance: new Set(),
    };
    const newPrices = {};
    const bookingsByDate = {}; // Map dates to booking info

    // Process bookings - mark as booked (simplified to match old implementation)
    bookingData.forEach((booking) => {
      const arrivalDate = booking.arrivaldate ? new Date(booking.arrivaldate) : null;
      const departureDate = booking.departuredate ? new Date(booking.departuredate) : null;

      if (arrivalDate && departureDate && !isNaN(arrivalDate) && !isNaN(departureDate)) {
        const currentDate = new Date(arrivalDate);
        while (currentDate <= departureDate) {
          const dateKey = currentDate.toISOString().split("T")[0];
          newSelections.booked.add(dateKey);

          // Store booking information for this date
          if (!bookingsByDate[dateKey]) {
            bookingsByDate[dateKey] = [];
          }
          bookingsByDate[dateKey].push({
            id: booking.id || booking.booking_id,
            guestName: booking.guestname || 'Guest',
            guestEmail: booking.guest_email || booking.guestEmail || '',
            checkIn: arrivalDate.toISOString().split('T')[0],
            checkOut: departureDate.toISOString().split('T')[0],
            totalPrice: booking.total_price || booking.totalPrice || 0,
            status: booking.status || 'Confirmed',
            guests: booking.guests || 1,
            nights: Math.ceil((departureDate - arrivalDate) / (1000 * 60 * 60 * 24)) || 1
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });


    // Process property availability
    if (details?.propertyAvailability || details?.availability) {
      const availabilityData = details.propertyAvailability || details.availability;
      const availability = Array.isArray(availabilityData)
        ? availabilityData
        : [availabilityData];

      availability.forEach((avail) => {
        if (avail.availableStartDate && avail.availableEndDate) {
          // Handle timestamp format
          const startDate = new Date(avail.availableStartDate);
          const endDate = new Date(avail.availableEndDate);

          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const key = toKey(currentDate);
            // Only mark as available if not already booked
            if (!newSelections.booked.has(key)) {
              newSelections.available.add(key);
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
    }


    // Process pricing - try multiple sources
    // 1. First check if pricing came with bookings API response
    const bookingPricing = bookingData._pricing;
    // 2. Then check property details
    const detailsPricing = details?.propertyPricing || details?.pricing;

    const pricing = bookingPricing || detailsPricing;

    if (pricing) {
      const baseRate = pricing.roomrate || pricing.roomRate || pricing.cleaning;
      if (baseRate) {

        // Set default price for all visible dates (booked + available)
        newSelections.available.forEach((key) => {
          newPrices[key] = baseRate;
        });
        newSelections.booked.forEach((key) => {
          newPrices[key] = baseRate;
        });
      }
    }

    setSelections(newSelections);
    setPrices(newPrices);
    setBookingsByDate(bookingsByDate);
  }, []);

  // Apply saved calendar data (blocked, maintenance, pricing)
  const applySavedCalendarData = useCallback((savedData) => {

    setSelections((prev) => {
      const next = { ...prev };

      // Apply blocked dates
      if (savedData.blocked && Array.isArray(savedData.blocked)) {
        savedData.blocked.forEach((dateStr) => {
          next.blocked.add(dateStr);
          // Remove from available if it was there
          next.available.delete(dateStr);
        });
      }

      // Apply maintenance dates
      if (savedData.maintenance && Array.isArray(savedData.maintenance)) {
        savedData.maintenance.forEach((item) => {
          const dateStr = typeof item === 'string' ? item : item.date;
          const note = typeof item === 'object' ? item.note : '';

          next.maintenance.add(dateStr);
          // Remove from available if it was there
          next.available.delete(dateStr);

          // Store note
          if (note) {
            setMaintenanceNotes((prevNotes) => ({
              ...prevNotes,
              [dateStr]: note
            }));
          }
        });
      }

      return next;
    });

    // Apply saved prices
    if (savedData.prices && typeof savedData.prices === 'object') {
      setPrices((prev) => ({
        ...prev,
        ...savedData.prices
      }));
    }

  }, []);

  // Fetch property data when selected
  useEffect(() => {
    if (!selectedPropertyId) {
      setDebugInfo(null);
      setApiError(null);
      return;
    }

    const fetchPropertyData = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        // Fetch property details and bookings in parallel for better performance
        const [details, bookingsResponse] = await Promise.all([
          calendarService.fetchPropertyDetails(selectedPropertyId),
          calendarService.fetchPropertyBookings(selectedPropertyId)
        ]);

        setPropertyDetails(details);
        setBookings(bookingsResponse);

        // Set debug info for development
        const bookingsCount = Array.isArray(bookingsResponse) ? bookingsResponse.length : 0;
        setDebugInfo({
          propertyId: selectedPropertyId,
          bookingsCount: bookingsCount,
          hasDetails: !!details,
          hasAvailability: !!(details?.propertyAvailability || details?.availability),
          hasPricing: !!(details?.propertyPricing || details?.pricing),
          propertyTitle: details?.property?.title || details?.property?.Title || 'Unknown',
          lastFetched: new Date().toISOString()
        });

        // Process bookings into calendar format
        processBookingsIntoCalendar(bookingsResponse, details);

        // Load previously saved calendar customizations (blocked dates, maintenance, custom pricing)
        const savedData = await calendarService.loadCalendarData(selectedPropertyId);
        if (savedData) {
          applySavedCalendarData(savedData);
        }
      } catch (error) {
        const errorMessage = error.message || "Unknown error occurred";
        setApiError(errorMessage);
        setDebugInfo({
          error: errorMessage,
          propertyId: selectedPropertyId,
          timestamp: new Date().toISOString()
        });

        // Show user-friendly error message
        if (errorMessage.includes("Authentication token not found")) {
          alert("⚠️ Authentication Error\n\nYou are not logged in. Please log in to view calendar data.");
        } else if (errorMessage.includes("Failed to fetch")) {
          alert("⚠️ Network Error\n\nCould not connect to the server. Please check your internet connection.");
        } else {
          alert(`⚠️ Error Loading Calendar\n\n${errorMessage}\n\nPlease refresh the page or contact support if the issue persists.`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyData();
  }, [selectedPropertyId, processBookingsIntoCalendar, applySavedCalendarData]);

  const toggleDayIn = (bucket, key) => {
    setSelections((prev) => {
      const next = { ...prev, [bucket]: new Set(prev[bucket]) };
      if (next[bucket].has(key)) {
        next[bucket].delete(key);
      } else {
        next[bucket].add(key);
      }

      // Remove from other buckets
      Object.keys(prev).forEach((b) => {
        if (b !== bucket) next[b] = new Set([...next[b]].filter((k) => k !== key));
      });

      // Track pending changes for blocked/maintenance
      if (bucket === "blocked" || bucket === "maintenance") {
        setPendingChanges((prevChanges) => ({
          ...prevChanges,
          [bucket]: new Set([...prevChanges[bucket], key])
        }));
      }

      return next;
    });
  };

  const setPriceForSelection = () => {
    const value = parseFloat(tempPrice);
    if (Number.isNaN(value) || value < 0) return;

    setPrices((prev) => {
      const next = { ...prev };
      const updatedPrices = {};

      selections.available.forEach((k) => {
        next[k] = value;
        updatedPrices[k] = value;
      });
      selections.booked.forEach((k) => {
        next[k] = value;
        updatedPrices[k] = value;
      });
      selections.blocked.forEach((k) => {
        next[k] = value;
        updatedPrices[k] = value;
      });
      selections.maintenance.forEach((k) => {
        next[k] = value;
        updatedPrices[k] = value;
      });

      // Track pending price changes
      setPendingChanges((prevChanges) => ({
        ...prevChanges,
        prices: { ...prevChanges.prices, ...updatedPrices }
      }));

      return next;
    });
    setTempPrice("");
  };

  // Block dates handler
  const handleBlockDates = () => {
    // Toggle selected dates to blocked
    setSelections((prev) => {
      const next = { ...prev };
      const selectedKeys = new Set([
        ...prev.available,
        ...prev.maintenance,
      ]);

      selectedKeys.forEach((key) => {
        next.blocked.add(key);
        next.available.delete(key);
        next.maintenance.delete(key);
      });

      setPendingChanges((prevChanges) => ({
        ...prevChanges,
        blocked: new Set([...prevChanges.blocked, ...selectedKeys])
      }));

      return next;
    });
  };

  // Maintenance handler - open modal
  const handleMaintenance = () => {
    console.log('🔧 handleMaintenance called in HostCalendar');
    console.log('Current selections:', selections);

    const selectedKeys = [
      ...selections.available,
      ...selections.blocked,
    ];

    console.log('Selected keys:', selectedKeys);
    console.log('Selected keys length:', selectedKeys.length);

    if (selectedKeys.length === 0) {
      console.warn('⚠️ No dates selected');
      alert("Please select dates first by clicking on available or blocked dates");
      return;
    }

    console.log('✅ Opening maintenance modal');
    setShowMaintenanceModal(true);
  };

  // Save maintenance with note
  const handleSaveMaintenanceWithNote = (note) => {
    const selectedKeys = new Set([
      ...selections.available,
      ...selections.blocked,
    ]);

    if (selectedKeys.size === 0) return;

    // Update selections
    setSelections((prev) => {
      const next = { ...prev };

      selectedKeys.forEach((key) => {
        next.maintenance.add(key);
        next.available.delete(key);
        next.blocked.delete(key);
      });

      return next;
    });

    // Store notes for each date
    const newNotes = {};
    selectedKeys.forEach((key) => {
      newNotes[key] = note;
    });

    setMaintenanceNotes((prev) => ({
      ...prev,
      ...newNotes
    }));

    // Track pending changes
    setPendingChanges((prevChanges) => ({
      ...prevChanges,
      maintenance: new Set([...prevChanges.maintenance, ...selectedKeys])
    }));

  };

  // Undo handler
  const handleUndo = () => {
    if (!selectedPropertyId || !propertyDetails) {
      setSelections(initialBlocks);
      setPrices(initialPrices);
      setPendingChanges({
        blocked: new Set(),
        maintenance: new Set(),
        prices: {}
      });
      return;
    }

    // Reload from server data
    processBookingsIntoCalendar(bookings, propertyDetails);
    setPendingChanges({
      blocked: new Set(),
      maintenance: new Set(),
      prices: {}
    });
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    if (!selectedPropertyId) return;

    setIsSaving(true);
    try {
      // Prepare maintenance data with notes
      const maintenanceData = Array.from(pendingChanges.maintenance).map((dateStr) => ({
        date: dateStr,
        note: maintenanceNotes[dateStr] || ''
      }));

      const changes = {
        availability: {
          blocked: Array.from(pendingChanges.blocked),
          maintenance: maintenanceData,
        },
        pricing: pendingChanges.prices,
      };

      const result = await calendarService.saveCalendarChanges(selectedPropertyId, changes);

      // Determine success based on API responses
      const availabilitySuccess = result?.availability?.success !== false;
      const pricingSuccess = result?.pricing?.success !== false;
      const overallSuccess = availabilitySuccess && pricingSuccess;

      // Clear pending changes only if AWS API save was successful
      if (overallSuccess) {
        setPendingChanges({
          blocked: new Set(),
          maintenance: new Set(),
          prices: {}
        });
      }

      // Build detailed user feedback message
      const blockedCount = changes.availability.blocked.length;
      const maintenanceCount = changes.availability.maintenance.length;
      const pricingCount = Object.keys(changes.pricing).length;

      let message = "";

      if (overallSuccess) {
        message = "✅ SUCCESS: Calendar data saved to AWS database\n\n";
      } else {
        message = "⚠️ WARNING: Could not save to AWS database\n\n";
      }

      message += "Changes made:\n";
      if (blockedCount > 0) message += `  • ${blockedCount} blocked date${blockedCount > 1 ? 's' : ''}\n`;
      if (maintenanceCount > 0) message += `  • ${maintenanceCount} maintenance date${maintenanceCount > 1 ? 's' : ''}\n`;
      if (pricingCount > 0) message += `  • ${pricingCount} custom price${pricingCount > 1 ? 's' : ''}\n`;

      message += "\nStorage status:\n";

      if (availabilitySuccess && blockedCount + maintenanceCount > 0) {
        message += "  ✓ Availability: Saved to AWS\n";
      } else if (!availabilitySuccess && blockedCount + maintenanceCount > 0) {
        message += "  ✗ Availability: " + (result?.availability?.error || "Failed to save to AWS") + "\n";
      }

      if (pricingSuccess && pricingCount > 0) {
        message += "  ✓ Pricing: Saved to AWS\n";
      } else if (!pricingSuccess && pricingCount > 0) {
        message += "  ✗ Pricing: " + (result?.pricing?.error || "Failed to save to AWS") + "\n";
      }

      if (!overallSuccess) {
        message += "\n📦 Data saved to browser localStorage as backup\n";
        message += "Please check:\n";
        message += "  • Your internet connection\n";
        message += "  • AWS API is accessible\n";
        message += "  • Your authentication token is valid\n";
      }

      alert(message);

      // Reload data from server to confirm save
      if (overallSuccess) {
        const savedData = await calendarService.loadCalendarData(selectedPropertyId);
        if (savedData) {
          applySavedCalendarData(savedData);
        }
      }
    } catch (error) {
      alert(`❌ ERROR: Failed to save changes\n\nDetails: ${error.message}\n\nPlease try again or contact support if the issue persists.`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPendingChanges =
    pendingChanges.blocked.size > 0 ||
    pendingChanges.maintenance.size > 0 ||
    Object.keys(pendingChanges.prices).length > 0;

  return (
    <div className="hc-container">
      <div className="hc-header-row">
        <Toolbar
          view={view}
          setView={setView}
          cursor={cursor}
          onPrev={prev}
          onNext={next}
          onToday={today}
          selectedPropertyId={selectedPropertyId}
          onPropertySelect={setSelectedPropertyId}
        />
      </div>

      {/* Debug Info Panel */}
      {debugInfo && (
        <div style={{
          background: "#e3f2fd",
          border: "1px solid #2196f3",
          borderRadius: "8px",
          padding: "12px",
          margin: "12px 0",
          fontSize: "12px",
          fontFamily: "monospace"
        }}>
          <strong>📊 Debug Info:</strong>
          <div>Property ID: {debugInfo.propertyId}</div>
          <div>Bookings Count: {debugInfo.bookingsCount}</div>
          <div>Has Details: {debugInfo.hasDetails ? '✅' : '❌'}</div>
          <div>Has Availability: {debugInfo.hasAvailability ? '✅' : '❌'}</div>
          <div>Has Pricing: {debugInfo.hasPricing ? '✅' : '❌'}</div>
          {debugInfo.error && <div style={{ color: "red" }}>Error: {debugInfo.error}</div>}
        </div>
      )}

      {apiError && (
        <div style={{
          background: "#ffebee",
          border: "1px solid #f44336",
          borderRadius: "8px",
          padding: "12px",
          margin: "12px 0",
          color: "#c62828"
        }}>
          ❌ API Error: {apiError}
        </div>
      )}

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          Loading property data...
        </div>
      )}

      {!isLoading && (
        <>
          <div className="hc-top-cards">
            <AvailabilityCard
              onBlock={handleBlockDates}
              onMaintenance={handleMaintenance}
              onUndo={handleUndo}
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
            bookingsByDate={bookingsByDate}
            onToggle={(bucket, key) => toggleDayIn(bucket, key)}
            onDragSelect={(keys) =>
              setSelections((prev) => ({ ...prev, available: new Set(keys) }))
            }
          />

          <StatsPanel selections={selections} />

          {hasPendingChanges && (
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                className="hc-btn primary"
                onClick={handleSaveChanges}
                disabled={isSaving}
                style={{ padding: "12px 24px", fontSize: "16px" }}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Maintenance Modal */}
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSave={handleSaveMaintenanceWithNote}
        selectedDates={[...selections.available, ...selections.blocked]}
      />
    </div>
  );
}
