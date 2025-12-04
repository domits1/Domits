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
  const [bookingsByDate, setBookingsByDate] = useState({}); 
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
  const [maintenanceNotes, setMaintenanceNotes] = useState({});
  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const next = () => setCursor(addMonthsUTC(cursor, 1));
  const prev = () => setCursor(subMonthsUTC(cursor, 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));
  const jumpToAvailability = () => {
    const availabilityData = propertyDetails?.propertyAvailability || propertyDetails?.availability;
    if (availabilityData && Array.isArray(availabilityData) && availabilityData.length > 0) {
      const firstAvail = availabilityData[0];
      if (firstAvail.availableStartDate) {
        const firstDate = new Date(firstAvail.availableStartDate);
        setCursor(startOfMonthUTC(firstDate));
        console.log("Jumped to first available month:", firstDate);
      }
    }
  };
  useEffect(() => {
    if (!selectedPropertyId) {
      setDebugInfo(null);
      setApiError(null);
      return;
    }

    const fetchPropertyData = async () => {
      setIsLoading(true);
      setApiError(null);
      console.log("🔄 Fetching data for property:", selectedPropertyId);

      try {
        const [details, propertyBookings] = await Promise.all([
          calendarService.fetchPropertyDetails(selectedPropertyId),
          calendarService.fetchPropertyBookings(selectedPropertyId)
        ]);

        console.log("✅ API Response - Property Details:", details);
        console.log("✅ API Response - Bookings:", propertyBookings);
        setPropertyDetails(details);
        setBookings(propertyBookings);
        setDebugInfo({
          propertyId: selectedPropertyId,
          bookingsCount: propertyBookings?.length || 0,
          hasDetails: !!details,
          hasAvailability: !!(details?.propertyAvailability || details?.availability),
          hasPricing: !!(details?.propertyPricing || details?.pricing),
          rawDetails: details,
          rawBookings: propertyBookings
        });
        processBookingsIntoCalendar(propertyBookings, details);
        const savedData = await calendarService.loadCalendarData(selectedPropertyId);
        if (savedData) {
          applySavedCalendarData(savedData);
        }
      } catch (error) {
        console.error("❌ Error fetching property data:", error);
        setApiError(error.message);
        setDebugInfo({
          error: error.message,
          propertyId: selectedPropertyId
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPropertyData();
  }, [selectedPropertyId]);

  const processBookingsIntoCalendar = useCallback((bookingData, details) => {
    console.log("=== Processing Calendar Data ===");
    console.log("Bookings:", bookingData);
    console.log("Details:", details);

    const newSelections = {
      booked: new Set(),
      available: new Set(),
      blocked: new Set(),
      maintenance: new Set(),
    };
    const newPrices = {};
    const bookingsByDate = {}; 
    bookingData.forEach((booking) => {
      console.log("Processing booking:", booking);
      const checkIn = booking.checkInDate || booking.check_in_date || booking.checkin;
      const checkOut = booking.checkOutDate || booking.check_out_date || booking.checkout;

      if (checkIn && checkOut) {
        const startDate = new Date(checkIn);
        const endDate = new Date(checkOut);
        console.log(`Booking from ${startDate.toISOString()} to ${endDate.toISOString()}`);
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const key = toKey(currentDate);
          newSelections.booked.add(key);
          if (!bookingsByDate[key]) {
            bookingsByDate[key] = [];
          }
          bookingsByDate[key].push({
            id: booking.booking_id || booking.id,
            guestName: booking.guest_name || booking.guestName || booking.user_name || 'Guest',
            guestEmail: booking.guest_email || booking.guestEmail || booking.email || '',
            checkIn: startDate.toISOString().split('T')[0],
            checkOut: endDate.toISOString().split('T')[0],
            totalPrice: booking.total_price || booking.totalPrice || booking.price || 0,
            status: booking.status || booking.booking_status || 'confirmed',
            guests: booking.number_of_guests || booking.numberOfGuests || booking.guests || 1,
            nights: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1
          });

          console.log(`Marked ${key} as booked`);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        console.warn("Booking missing date fields:", booking);
      }
    });
    console.log(`Total booked dates: ${newSelections.booked.size}`);
    if (details?.propertyAvailability || details?.availability) {
      const availabilityData = details.propertyAvailability || details.availability;
      const availability = Array.isArray(availabilityData)
        ? availabilityData
        : [availabilityData];

      availability.forEach((avail) => {
        if (avail.availableStartDate && avail.availableEndDate) {
          const startDate = new Date(avail.availableStartDate);
          const endDate = new Date(avail.availableEndDate);
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            const key = toKey(currentDate);
            if (!newSelections.booked.has(key)) {
              newSelections.available.add(key);
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
        }
      });
    }

    console.log(`Total available dates: ${newSelections.available.size}`);
    const pricing = details?.propertyPricing || details?.pricing;
    if (pricing?.roomRate || pricing?.roomrate) {
      const baseRate = pricing.roomRate || pricing.roomrate;
      console.log(`Base room rate: €${baseRate}`);
      newSelections.available.forEach((key) => {
        newPrices[key] = baseRate;
      });
      newSelections.booked.forEach((key) => {
        newPrices[key] = baseRate;
      });
    }

    console.log("=== Calendar Processing Complete ===");
    console.log("Final selections:", {
      booked: newSelections.booked.size,
      available: newSelections.available.size,
      blocked: newSelections.blocked.size,
      maintenance: newSelections.maintenance.size
    });
    console.log("Bookings by date:", bookingsByDate);
    setSelections(newSelections);
    setPrices(newPrices);
    setBookingsByDate(bookingsByDate);
  }, []);
  const applySavedCalendarData = useCallback((savedData) => {
    console.log("📥 Applying saved calendar data:", savedData);
    setSelections((prev) => {
      const next = { ...prev };
      if (savedData.blocked && Array.isArray(savedData.blocked)) {
        savedData.blocked.forEach((dateStr) => {
          next.blocked.add(dateStr);
          // Remove from available if it was there
          next.available.delete(dateStr);
        });
      }
      if (savedData.maintenance && Array.isArray(savedData.maintenance)) {
        savedData.maintenance.forEach((item) => {
          const dateStr = typeof item === 'string' ? item : item.date;
          const note = typeof item === 'object' ? item.note : '';
          next.maintenance.add(dateStr);
          next.available.delete(dateStr);
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
    if (savedData.prices && typeof savedData.prices === 'object') {
      setPrices((prev) => ({
        ...prev,
        ...savedData.prices
      }));
    }
    console.log("✅ Saved calendar data applied successfully");
  }, []);

  const toggleDayIn = (bucket, key) => {
    setSelections((prev) => {
      const next = { ...prev, [bucket]: new Set(prev[bucket]) };
      if (next[bucket].has(key)) {
        next[bucket].delete(key);
      } else {
        next[bucket].add(key);
      }
      Object.keys(prev).forEach((b) => {
        if (b !== bucket) next[b] = new Set([...next[b]].filter((k) => k !== key));
      });

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
      setPendingChanges((prevChanges) => ({
        ...prevChanges,
        prices: { ...prevChanges.prices, ...updatedPrices }
      }));

      return next;
    });
    setTempPrice("");
  };

  const handleBlockDates = () => {
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
  const handleMaintenance = () => {
    const selectedKeys = [
      ...selections.available,
      ...selections.blocked,
    ];

    if (selectedKeys.length === 0) {
      alert("Please select dates first by clicking on available or blocked dates");
      return;
    }
    setShowMaintenanceModal(true);
  };
  const handleSaveMaintenanceWithNote = (note) => {
    const selectedKeys = new Set([
      ...selections.available,
      ...selections.blocked,
    ]);

    if (selectedKeys.size === 0) return;
    setSelections((prev) => {
      const next = { ...prev };
      selectedKeys.forEach((key) => {
        next.maintenance.add(key);
        next.available.delete(key);
        next.blocked.delete(key);
      });

      return next;
    });
    const newNotes = {};
    selectedKeys.forEach((key) => {
      newNotes[key] = note;
    });

    setMaintenanceNotes((prev) => ({
      ...prev,
      ...newNotes
    }));

    setPendingChanges((prevChanges) => ({
      ...prevChanges,
      maintenance: new Set([...prevChanges.maintenance, ...selectedKeys])
    }));

    console.log("✅ Maintenance dates added with note:", note);
  };

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

    processBookingsIntoCalendar(bookings, propertyDetails);
    setPendingChanges({
      blocked: new Set(),
      maintenance: new Set(),
      prices: {}
    });
  };
  const handleSaveChanges = async () => {
    if (!selectedPropertyId) return;

    setIsSaving(true);
    try {
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
      setPendingChanges({
        blocked: new Set(),
        maintenance: new Set(),
        prices: {}
      });
      const blockedCount = changes.availability.blocked.length;
      const maintenanceCount = changes.availability.maintenance.length;
      const pricingCount = Object.keys(changes.pricing).length;
      const saveSuccess = result?.availability?.success !== false && result?.pricing?.success !== false;
      let message = saveSuccess
        ? "✅ Calendar data saved successfully!\n\n"
        : "⚠️ Calendar data saved (fallback)\n\n";

      message += "Summary of changes:\n";
      if (blockedCount > 0) message += `  • ${blockedCount} blocked date${blockedCount > 1 ? 's' : ''}\n`;
      if (maintenanceCount > 0) message += `  • ${maintenanceCount} maintenance date${maintenanceCount > 1 ? 's' : ''}\n`;
      if (pricingCount > 0) message += `  • ${pricingCount} price update${pricingCount > 1 ? 's' : ''}\n`;

      if (saveSuccess) {
        message += "\n✓ Data saved to: calendar-data/" + selectedPropertyId + ".json\n";
        message += "✓ Changes will be visible to other developers via Git\n";
      } else {
        message += "\n⚠️ Calendar data server not running!\n";
        message += "To enable file storage, run:\n";
        message += "  npm run calendar-server\n\n";
        message += "Data is currently in localStorage only.\n";
      }
      alert(message);
      console.log("📊 Calendar Changes Summary:", result);
    } catch (error) {
      console.error("Error saving changes:", error);
      alert("Failed to save changes. Please try again.");
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
      {debugInfo && debugInfo.hasAvailability && (
        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <button
            onClick={jumpToAvailability}
            className="hc-btn primary"
            style={{ padding: "10px 20px", fontSize: "14px" }}
          >
            🚀 Jump to Available Dates
          </button>
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
      <MaintenanceModal
        isOpen={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSave={handleSaveMaintenanceWithNote}
        selectedDates={[...selections.available, ...selections.blocked]}
      />
    </div>
  );
}
