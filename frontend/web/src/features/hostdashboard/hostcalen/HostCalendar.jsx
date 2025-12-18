import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./HostCalendar.scss";
import Toolbar from "./components/Toolbar";
import Legend from "./components/Legend";
import CalendarGrid from "./components/CalendarGrid";
import StatsPanel from "./components/StatsPanel";
import MaintenanceModal from "./components/MaintenanceModal";
import Toast from "./components/Toast";
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
  const [visuallySelectedDates, setVisuallySelectedDates] = useState(new Set()); 
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };
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
      }
    }
  };
  const processBookingsIntoCalendar = useCallback((bookingData, details) => {
    const newSelections = {
      booked: new Set(),
      available: new Set(),
      blocked: new Set(),
      maintenance: new Set(),
    };
    const newPrices = {};
    const bookingsByDate = {}; 
    bookingData.forEach((booking) => {
      const arrivalDate = booking.arrivaldate ? new Date(booking.arrivaldate) : null;
      const departureDate = booking.departuredate ? new Date(booking.departuredate) : null;
      if (arrivalDate && departureDate && !isNaN(arrivalDate) && !isNaN(departureDate)) {
        const currentDate = new Date(arrivalDate);
        while (currentDate <= departureDate) {
          const dateKey = currentDate.toISOString().split("T")[0];
          newSelections.booked.add(dateKey);
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

    const bookingPricing = bookingData._pricing;
    const detailsPricing = details?.propertyPricing || details?.pricing;
    const pricing = bookingPricing || detailsPricing;
    if (pricing) {
      const baseRate = pricing.roomrate || pricing.roomRate || pricing.cleaning;
      if (baseRate) {
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

  const applySavedCalendarData = useCallback((savedData) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (savedData.blocked && Array.isArray(savedData.blocked)) {
        savedData.blocked.forEach((dateStr) => {
          next.blocked.add(dateStr);
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

  }, []);

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
        const [details, bookingsResponse] = await Promise.all([
          calendarService.fetchPropertyDetails(selectedPropertyId),
          calendarService.fetchPropertyBookings(selectedPropertyId)
        ]);
        setPropertyDetails(details);
        setBookings(bookingsResponse);
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
        processBookingsIntoCalendar(bookingsResponse, details);
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
        if (errorMessage.includes("Authentication token not found")) {
          showToast("You are not logged in. Please log in to view calendar data.", 'error');
        } else if (errorMessage.includes("Failed to fetch")) {
          showToast("Could not connect to the server. Please check your internet connection.", 'error');
        } else {
          showToast(`Error loading calendar: ${errorMessage}`, 'error');
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

    if (visuallySelectedDates.size === 0) {
      showToast('Please select dates first by clicking on them (they will turn green)', 'warning');
      return;
    }
    setPrices((prev) => {
      const next = { ...prev };
      const updatedPrices = {};
      visuallySelectedDates.forEach((k) => {
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
    setVisuallySelectedDates(new Set());
  };

  const handleBlockDates = () => {
    if (visuallySelectedDates.size === 0) {
      showToast('Please select dates first by clicking on them (they will turn green)', 'warning');
      return;
    }
    setSelections((prev) => {
      const next = { ...prev };
      visuallySelectedDates.forEach((key) => {
        next.blocked.add(key);
        next.available.delete(key);
        next.maintenance.delete(key);
      });
      setPendingChanges((prevChanges) => ({
        ...prevChanges,
        blocked: new Set([...prevChanges.blocked, ...visuallySelectedDates])
      }));

      return next;
    });
    setVisuallySelectedDates(new Set());
  };
  const handleMaintenance = () => {
    if (visuallySelectedDates.size === 0) {
      showToast("Please select dates first by clicking on them (they will turn green)", 'warning');
      return;
    }

    setShowMaintenanceModal(true);
  };
  const handleSaveMaintenanceWithNote = (note) => {
    if (visuallySelectedDates.size === 0) {
      return;
    }
    setSelections((prev) => {
      const next = { ...prev };

      visuallySelectedDates.forEach((key) => {
        next.maintenance.add(key);
        next.available.delete(key);
        next.blocked.delete(key);
      });

      return next;
    });
    const newNotes = {};
    visuallySelectedDates.forEach((key) => {
      newNotes[key] = note;
    });

    setMaintenanceNotes((prev) => ({
      ...prev,
      ...newNotes
    }));
    setPendingChanges((prevChanges) => ({
      ...prevChanges,
      maintenance: new Set([...prevChanges.maintenance, ...visuallySelectedDates])
    }));
    setVisuallySelectedDates(new Set());
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
    if (!selectedPropertyId) {
      showToast('Please select a property first', 'warning');
      return;
    }

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
      const availabilitySuccess = result?.availability?.success !== false;
      const pricingSuccess = result?.pricing?.success !== false;
      const overallSuccess = availabilitySuccess && pricingSuccess;
      if (overallSuccess) {
        setPendingChanges({
          blocked: new Set(),
          maintenance: new Set(),
          prices: {}
        });
      }
      const blockedCount = changes.availability.blocked.length;
      const maintenanceCount = changes.availability.maintenance.length;
      const pricingCount = Object.keys(changes.pricing).length;

      if (overallSuccess) {
        const totalChanges = blockedCount + maintenanceCount + pricingCount;
        showToast(`Successfully saved ${totalChanges} change${totalChanges !== 1 ? 's' : ''} to calendar`, 'success');
      } else {
        showToast("Changes saved locally but could not sync with server. Please try again.", 'warning');
      }
      if (overallSuccess) {
        const savedData = await calendarService.loadCalendarData(selectedPropertyId);
        if (savedData) {
          applySavedCalendarData(savedData);
        }
      }
    } catch (error) {
      showToast(`Failed to save changes: ${error.message}`, 'error');
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
            onSelectionChange={setVisuallySelectedDates}
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
        selectedDates={Array.from(visuallySelectedDates)}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
