import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./HostCalendar.scss";

import Toolbar from "./components/Toolbar";
import CalendarGrid from "./components/CalendarGrid";
import PulseBarsLoader from "./components/PulseBarsLoader";
import AvailabilityCard from "./components/Sidebar/AvailabilityCard";
import PricingCard from "./components/Sidebar/PricingCard";
import CalendarLinkCard from "./components/Sidebar/CalendarLinkCard";
import PricingSettingsCard from "./components/Sidebar/PricingSettingsCard";
import AvailabilitySettingsCard from "./components/Sidebar/AvailabilitySettingsCard";
import CalendarSyncCard from "./components/Sidebar/CalendarSyncCard";
import SelectionCard from "./components/Sidebar/SelectionCard";

import {
  addMonthsUTC,
  getMonthMatrix,
  startOfMonthUTC,
  subMonthsUTC,
} from "./utils/date";
import { createInitialPricingForm } from "../hostproperty/constants";
import { buildPricingSnapshot, normalizeAvailabilityRanges } from "./hooks/hostCalendarHelpers";
import { useAvailabilitySettings } from "./hooks/useAvailabilitySettings";
import { useCalendarBookings } from "./hooks/useCalendarBookings";
import { useCalendarListings } from "./hooks/useCalendarListings";
import { useCalendarPropertyDetails } from "./hooks/useCalendarPropertyDetails";
import { useCalendarSelection } from "./hooks/useCalendarSelection";
import { useCalendarSync } from "./hooks/useCalendarSync";
import { usePricingSettings } from "./hooks/usePricingSettings";
import { uploadICalToS3 } from "../../../utils/iCalFormatHost";
import { getCognitoUserId } from "../../../services/getAccessToken";

const availabilityWindowOptionShape = PropTypes.shape({
  value: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
});

const selectedAvailabilityStatsShape = PropTypes.shape({
  total: PropTypes.number.isRequired,
  allAvailable: PropTypes.bool.isRequired,
});

const normalizedPricingSettingsFormShape = PropTypes.shape({
  nightlyRate: PropTypes.number.isRequired,
  weeklyDiscountEnabled: PropTypes.bool.isRequired,
  weeklyDiscountPercent: PropTypes.number.isRequired,
  monthlyDiscountEnabled: PropTypes.bool.isRequired,
  monthlyDiscountPercent: PropTypes.number.isRequired,
});

const pricingSnapshotShape = PropTypes.shape({
  nightlyRate: PropTypes.number.isRequired,
  weekendRate: PropTypes.number.isRequired,
  weeklyDiscountPercent: PropTypes.number.isRequired,
  minimumStay: PropTypes.number.isRequired,
  maximumStay: PropTypes.number.isRequired,
  advanceNoticeDays: PropTypes.number.isRequired,
});

const pricingSettingsFormShape = PropTypes.shape({
  nightlyRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  weeklyDiscountEnabled: PropTypes.bool.isRequired,
  weeklyDiscountPercent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  monthlyDiscountEnabled: PropTypes.bool.isRequired,
  monthlyDiscountPercent: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
});

const availabilitySettingsFormShape = PropTypes.shape({
  minimumStay: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  maximumStay: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  advanceNoticeDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  preparationTimeDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  availabilityWindowDays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
});

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const toUtcDateFromDateNumber = (dateNumber) => {
  const normalized = String(Math.trunc(Number(dateNumber) || 0));
  if (!/^\d{8}$/.test(normalized)) {
    return null;
  }

  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6));
  const day = Number(normalized.slice(6, 8));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const resolvePropertyLocationLabel = (propertyDetails) => {
  const location = propertyDetails?.propertyLocation || propertyDetails?.location || {};
  const street = String(location?.street || propertyDetails?.street || "").trim();
  const city = String(location?.city || propertyDetails?.city || "").trim();
  const country = String(location?.country || propertyDetails?.country || "").trim();
  return [street, city, country].filter(Boolean).join(", ");
};

const buildPropertyIcalExportEvents = ({
  propertyId,
  hostUserId,
  propertyDetails,
  availabilityRanges,
}) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  const normalizedHostUserId = String(hostUserId || "").trim();
  if (!normalizedPropertyId || !normalizedHostUserId) {
    return [];
  }

  const listingTitle = String(
    propertyDetails?.property?.title || propertyDetails?.title || "Domits listing"
  ).trim();
  const locationLabel = resolvePropertyLocationLabel(propertyDetails);
  const nowIso = new Date().toISOString();

  return (Array.isArray(availabilityRanges) ? availabilityRanges : [])
    .map((range, index) => {
      const start = toUtcDateFromDateNumber(range?.start);
      const end = toUtcDateFromDateNumber(range?.end);
      if (!start || !end) {
        return null;
      }

      const endExclusive = new Date(end.getTime() + ONE_DAY_IN_MS);
      return {
        UID: `${normalizedPropertyId}-${range.start}-${range.end}-${index}`,
        Dtstamp: nowIso,
        Dtstart: start.toISOString(),
        Dtend: endExclusive.toISOString(),
        Summary: `${listingTitle} - Available`,
        Location: locationLabel,
        AccommodationId: normalizedPropertyId,
        OwnerId: normalizedHostUserId,
      };
    })
    .filter(Boolean);
};

function HostCalendarSidebar({
  isSidebarLoading,
  sidebarLoadingMessage,
  selectedDateKeys,
  selectedAvailabilityStats,
  handleToggleAvailability,
  selectionPriceInput,
  handleSelectionPriceChange,
  selectionPriceDirty,
  canSaveSelectionPrice,
  handleSaveSelectionPrice,
  sidebarMode,
  normalizedPricingSettingsForm,
  pricingSnapshot,
  pricingSettingsForm,
  weekendRateInput,
  updatePricingSettingsForm,
  setWeekendRateInput,
  hasAnyPricingSettingsChanges,
  canSavePricingSettings,
  isSavingPricingSettings,
  pricingSettingsSaveError,
  handleSavePricingSettings,
  availabilitySettingsForm,
  availabilityWindowOptions,
  updateAvailabilitySettingsForm,
  hasAvailabilitySettingsChanges,
  canSaveAvailabilitySettings,
  isSavingAvailabilitySettings,
  availabilitySettingsSaveError,
  handleSaveAvailabilitySettings,
  hostCalendarExportUrl,
  calendarUrlInput,
  calendarNameInput,
  calendarProviderInput,
  updateCalendarSyncForm,
  handleCopyDomitsCalendarLink,
  domitsCalendarLinkCopied,
  handleAddCalendarSource,
  canAddCalendarSource,
  isSavingCalendarSync,
  calendarSyncError,
  isEditingCalendarSource,
  calendarSources,
  handleEditCalendarSource,
  editingCalendarSourceId,
  handleCancelEditCalendarSource,
  handleRefreshCalendarSource,
  refreshingCalendarSourceId,
  sourceSyncStateById,
  handleRefreshAllCalendarSources,
  isRefreshingAllCalendarSources,
  handleRemoveCalendarSource,
  removingCalendarSourceId,
  handleCalendarSyncBack,
  setSidebarMode,
  openCalendarSync,
}) {
  if (isSidebarLoading) {
    return (
      <section className="hc-sidebar-loading-card" aria-label="Loading pricing and availability">
        <PulseBarsLoader message={sidebarLoadingMessage} />
      </section>
    );
  }

  if (selectedDateKeys.length > 0) {
    return (
      <SelectionCard
        selectedCount={selectedAvailabilityStats.total}
        allSelectedAvailable={selectedAvailabilityStats.allAvailable}
        onToggleAvailability={handleToggleAvailability}
        priceInputValue={selectionPriceInput}
        onPriceInputChange={handleSelectionPriceChange}
        showSavePrice={selectionPriceDirty}
        canSavePrice={canSaveSelectionPrice}
        onSavePrice={handleSaveSelectionPrice}
      />
    );
  }

  if (sidebarMode === "pricing-settings") {
    return (
      <PricingSettingsCard
        nightlyRate={normalizedPricingSettingsForm.nightlyRate}
        weekendRate={pricingSnapshot.weekendRate}
        weeklyDiscountPercent={
          normalizedPricingSettingsForm.weeklyDiscountEnabled
            ? normalizedPricingSettingsForm.weeklyDiscountPercent
            : 0
        }
        monthlyDiscountPercent={
          normalizedPricingSettingsForm.monthlyDiscountEnabled
            ? normalizedPricingSettingsForm.monthlyDiscountPercent
            : 0
        }
        nightlyRateInput={pricingSettingsForm.nightlyRate}
        weekendRateInput={weekendRateInput}
        weeklyDiscountEnabled={pricingSettingsForm.weeklyDiscountEnabled}
        weeklyDiscountPercentInput={pricingSettingsForm.weeklyDiscountPercent}
        monthlyDiscountEnabled={pricingSettingsForm.monthlyDiscountEnabled}
        monthlyDiscountPercentInput={pricingSettingsForm.monthlyDiscountPercent}
        onNightlyRateChange={(value) => {
          const nextValue = String(value).trim();
          updatePricingSettingsForm({
            nightlyRate: nextValue,
          });
        }}
        onWeekendRateChange={(value) => {
          const nextValue = String(value).trim();
          setWeekendRateInput(nextValue);
        }}
        onWeeklyDiscountToggle={(enabled) =>
          updatePricingSettingsForm({
            weeklyDiscountEnabled: enabled,
            weeklyDiscountPercent:
              enabled && Number(pricingSettingsForm.weeklyDiscountPercent) <= 0
                ? createInitialPricingForm().weeklyDiscountPercent
                : pricingSettingsForm.weeklyDiscountPercent,
          })
        }
        onWeeklyDiscountPercentChange={(value) =>
          updatePricingSettingsForm({ weeklyDiscountPercent: Number(value) || 0 })
        }
        onMonthlyDiscountToggle={(enabled) =>
          updatePricingSettingsForm({
            monthlyDiscountEnabled: enabled,
            monthlyDiscountPercent:
              enabled && Number(pricingSettingsForm.monthlyDiscountPercent) <= 0
                ? createInitialPricingForm().monthlyDiscountPercent
                : pricingSettingsForm.monthlyDiscountPercent,
          })
        }
        onMonthlyDiscountPercentChange={(value) =>
          updatePricingSettingsForm({ monthlyDiscountPercent: Number(value) || 0 })
        }
        showSaveButton={hasAnyPricingSettingsChanges}
        canSave={canSavePricingSettings}
        saving={isSavingPricingSettings}
        saveError={pricingSettingsSaveError}
        onSave={handleSavePricingSettings}
        onBack={() => setSidebarMode("summary")}
      />
    );
  }

  if (sidebarMode === "availability-settings") {
    return (
      <AvailabilitySettingsCard
        minimumStayInput={availabilitySettingsForm.minimumStay}
        maximumStayInput={availabilitySettingsForm.maximumStay}
        advanceNoticeDaysInput={availabilitySettingsForm.advanceNoticeDays}
        preparationTimeDaysInput={availabilitySettingsForm.preparationTimeDays}
        availabilityWindowDaysInput={availabilitySettingsForm.availabilityWindowDays}
        availabilityWindowOptions={availabilityWindowOptions}
        onMinimumStayChange={(value) => {
          const nextValue = String(value).trim();
          updateAvailabilitySettingsForm({
            minimumStay: nextValue === "" ? "" : Number(nextValue),
          });
        }}
        onMaximumStayChange={(value) => {
          const nextValue = String(value).trim();
          updateAvailabilitySettingsForm({
            maximumStay: nextValue === "" ? "" : Number(nextValue),
          });
        }}
        onAdvanceNoticeChange={(value) =>
          updateAvailabilitySettingsForm({ advanceNoticeDays: Number(value) || 0 })
        }
        onPreparationTimeChange={(value) =>
          updateAvailabilitySettingsForm({ preparationTimeDays: Number(value) || 0 })
        }
        onAvailabilityWindowChange={(value) =>
          updateAvailabilitySettingsForm({ availabilityWindowDays: Number(value) || 365 })
        }
        showSaveButton={hasAvailabilitySettingsChanges}
        canSave={canSaveAvailabilitySettings}
        saving={isSavingAvailabilitySettings}
        saveError={availabilitySettingsSaveError}
        onSave={handleSaveAvailabilitySettings}
        onBack={() => setSidebarMode("summary")}
      />
    );
  }

  if (sidebarMode === "calendar-sync") {
    return (
      <CalendarSyncCard
        domitsCalendarLink={hostCalendarExportUrl}
        externalCalendarUrlInput={calendarUrlInput}
        calendarNameInput={calendarNameInput}
        calendarProviderInput={calendarProviderInput}
        onExternalCalendarUrlChange={(value) =>
          updateCalendarSyncForm({ calendarUrl: String(value || "") })
        }
        onCalendarNameChange={(value) => updateCalendarSyncForm({ calendarName: String(value || "") })}
        onCalendarProviderChange={(value) =>
          updateCalendarSyncForm({
            calendarProvider: String(value || "auto").trim().toLowerCase(),
          })
        }
        onCopyDomitsCalendarLink={handleCopyDomitsCalendarLink}
        domitsCalendarLinkCopied={domitsCalendarLinkCopied}
        onAddCalendar={handleAddCalendarSource}
        canAddCalendar={canAddCalendarSource}
        addingCalendar={isSavingCalendarSync}
        addCalendarError={calendarSyncError}
        isEditingCalendar={isEditingCalendarSource}
        connectedSources={calendarSources}
        onEditSource={handleEditCalendarSource}
        editingSourceId={editingCalendarSourceId}
        onCancelEdit={handleCancelEditCalendarSource}
        onRefreshSource={handleRefreshCalendarSource}
        refreshingSourceId={refreshingCalendarSourceId}
        sourceSyncStateById={sourceSyncStateById}
        onRefreshAllSources={handleRefreshAllCalendarSources}
        refreshingAllSources={isRefreshingAllCalendarSources}
        onRemoveSource={handleRemoveCalendarSource}
        removingSourceId={removingCalendarSourceId}
        onBack={handleCalendarSyncBack}
      />
    );
  }

  return (
    <>
      <PricingCard
        nightlyRate={pricingSnapshot.nightlyRate}
        weekendRate={pricingSnapshot.weekendRate}
        weeklyDiscountPercent={pricingSnapshot.weeklyDiscountPercent}
        onOpenSettings={() => setSidebarMode("pricing-settings")}
      />
      <AvailabilityCard
        minimumStay={pricingSnapshot.minimumStay}
        maximumStay={pricingSnapshot.maximumStay}
        advanceNoticeDays={pricingSnapshot.advanceNoticeDays}
        onOpenSettings={() => setSidebarMode("availability-settings")}
      />
      <CalendarLinkCard connectedCount={calendarSources.length} onOpenSettings={openCalendarSync} />
    </>
  );
}

HostCalendarSidebar.propTypes = {
  isSidebarLoading: PropTypes.bool.isRequired,
  sidebarLoadingMessage: PropTypes.string.isRequired,
  selectedDateKeys: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedAvailabilityStats: selectedAvailabilityStatsShape.isRequired,
  handleToggleAvailability: PropTypes.func.isRequired,
  selectionPriceInput: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  handleSelectionPriceChange: PropTypes.func.isRequired,
  selectionPriceDirty: PropTypes.bool.isRequired,
  canSaveSelectionPrice: PropTypes.bool.isRequired,
  handleSaveSelectionPrice: PropTypes.func.isRequired,
  sidebarMode: PropTypes.string.isRequired,
  normalizedPricingSettingsForm: normalizedPricingSettingsFormShape.isRequired,
  pricingSnapshot: pricingSnapshotShape.isRequired,
  pricingSettingsForm: pricingSettingsFormShape.isRequired,
  weekendRateInput: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  updatePricingSettingsForm: PropTypes.func.isRequired,
  setWeekendRateInput: PropTypes.func.isRequired,
  hasAnyPricingSettingsChanges: PropTypes.bool.isRequired,
  canSavePricingSettings: PropTypes.bool.isRequired,
  isSavingPricingSettings: PropTypes.bool.isRequired,
  pricingSettingsSaveError: PropTypes.string.isRequired,
  handleSavePricingSettings: PropTypes.func.isRequired,
  availabilitySettingsForm: availabilitySettingsFormShape.isRequired,
  availabilityWindowOptions: PropTypes.arrayOf(availabilityWindowOptionShape).isRequired,
  updateAvailabilitySettingsForm: PropTypes.func.isRequired,
  hasAvailabilitySettingsChanges: PropTypes.bool.isRequired,
  canSaveAvailabilitySettings: PropTypes.bool.isRequired,
  isSavingAvailabilitySettings: PropTypes.bool.isRequired,
  availabilitySettingsSaveError: PropTypes.string.isRequired,
  handleSaveAvailabilitySettings: PropTypes.func.isRequired,
  hostCalendarExportUrl: PropTypes.string.isRequired,
  calendarUrlInput: PropTypes.string.isRequired,
  calendarNameInput: PropTypes.string.isRequired,
  calendarProviderInput: PropTypes.string.isRequired,
  updateCalendarSyncForm: PropTypes.func.isRequired,
  handleCopyDomitsCalendarLink: PropTypes.func.isRequired,
  domitsCalendarLinkCopied: PropTypes.bool.isRequired,
  handleAddCalendarSource: PropTypes.func.isRequired,
  canAddCalendarSource: PropTypes.bool.isRequired,
  isSavingCalendarSync: PropTypes.bool.isRequired,
  calendarSyncError: PropTypes.string.isRequired,
  isEditingCalendarSource: PropTypes.bool.isRequired,
  calendarSources: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleEditCalendarSource: PropTypes.func.isRequired,
  editingCalendarSourceId: PropTypes.string.isRequired,
  handleCancelEditCalendarSource: PropTypes.func.isRequired,
  handleRefreshCalendarSource: PropTypes.func.isRequired,
  refreshingCalendarSourceId: PropTypes.string.isRequired,
  sourceSyncStateById: PropTypes.objectOf(PropTypes.string).isRequired,
  handleRefreshAllCalendarSources: PropTypes.func.isRequired,
  isRefreshingAllCalendarSources: PropTypes.bool.isRequired,
  handleRemoveCalendarSource: PropTypes.func.isRequired,
  removingCalendarSourceId: PropTypes.string.isRequired,
  handleCalendarSyncBack: PropTypes.func.isRequired,
  setSidebarMode: PropTypes.func.isRequired,
  openCalendarSync: PropTypes.func.isRequired,
};

export default function HostCalendar() {
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(startOfMonthUTC(new Date()));
  const [sidebarMode, setSidebarMode] = useState("summary");

  const {
    isLoadingListings,
    listingsError,
    selectedPropertyId,
    setSelectedPropertyId,
    listingOptions,
  } = useCalendarListings();

  const {
    propertyDetails,
    setPropertyDetails,
    isLoadingDetails,
    detailsError,
  } = useCalendarPropertyDetails({ selectedPropertyId });

  const { bookedDateKeysByPropertyId } = useCalendarBookings();
  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const availabilityRanges = useMemo(
    () => normalizeAvailabilityRanges(propertyDetails?.availability),
    [propertyDetails]
  );

  const ensurePropertyIcalExport = useCallback(async () => {
    const hostUserId = String(getCognitoUserId() || "").trim();
    const propertyId = String(selectedPropertyId || "").trim();
    if (!hostUserId || !propertyId) {
      return;
    }

    const events = buildPropertyIcalExportEvents({
      propertyId,
      hostUserId,
      propertyDetails,
      availabilityRanges,
    });

    await uploadICalToS3(events, hostUserId, propertyId);
  }, [availabilityRanges, propertyDetails, selectedPropertyId]);

  const {
    externalBlockedDates,
    calendarSources,
    calendarSyncError,
    isSavingCalendarSync,
    isLoadingCalendarSync,
    removingCalendarSourceId,
    refreshingCalendarSourceId,
    sourceSyncStateById,
    isRefreshingAllCalendarSources,
    editingCalendarSourceId,
    domitsCalendarLinkCopied,
    hostCalendarExportUrl,
    calendarUrlInput,
    calendarNameInput,
    calendarProviderInput,
    isEditingCalendarSource,
    canAddCalendarSource,
    updateCalendarSyncForm,
    handleCopyDomitsCalendarLink,
    handleEditCalendarSource,
    handleCancelEditCalendarSource,
    handleAddCalendarSource,
    handleRemoveCalendarSource,
    handleRefreshCalendarSource,
    handleRefreshAllCalendarSources,
  } = useCalendarSync({
    selectedPropertyId,
    onPrepareHostCalendarExport: ensurePropertyIcalExport,
  });

  const pricingSnapshot = useMemo(() => buildPricingSnapshot(propertyDetails), [propertyDetails]);

  const {
    availabilityOverrides,
    selectedPropertyPriceOverrides,
    selectedDateKeys,
    pendingSelectionStartKey,
    bookedDateKeys,
    selectedAvailabilityStats,
    selectionPriceInput,
    selectionPriceDirty,
    canSaveSelectionPrice,
    handleDateSelect,
    handleToggleAvailability,
    handleSelectionPriceChange,
    handleSaveSelectionPrice,
  } = useCalendarSelection({
    cursor,
    monthGrid,
    selectedPropertyId,
    pricingSnapshot,
    availabilityRanges,
    externalBlockedDates,
    bookedDateKeysByPropertyId,
  });

  const {
    pricingSettingsForm,
    normalizedPricingSettingsForm,
    weekendRateInput,
    hasAnyPricingSettingsChanges,
    canSavePricingSettings,
    isSavingPricingSettings,
    pricingSettingsSaveError,
    updatePricingSettingsForm,
    setWeekendRateInput,
    handleSavePricingSettings,
  } = usePricingSettings({
    selectedPropertyId,
    propertyDetails,
    setPropertyDetails,
    pricingSnapshot,
  });

  const {
    availabilitySettingsForm,
    availabilityWindowOptions,
    hasAvailabilitySettingsChanges,
    canSaveAvailabilitySettings,
    isSavingAvailabilitySettings,
    availabilitySettingsSaveError,
    updateAvailabilitySettingsForm,
    handleSaveAvailabilitySettings,
  } = useAvailabilitySettings({
    selectedPropertyId,
    propertyDetails,
    setPropertyDetails,
    pricingSnapshot,
  });

  const prev = () =>
    setCursor((currentCursor) => subMonthsUTC(currentCursor, view === "year" ? 12 : 1));
  const next = () =>
    setCursor((currentCursor) => addMonthsUTC(currentCursor, view === "year" ? 12 : 1));
  const today = () => setCursor(startOfMonthUTC(new Date()));

  const openCalendarSync = () => setSidebarMode("calendar-sync");
  const handleCalendarSyncBack = () => setSidebarMode("summary");

  const handleSelectProperty = (propertyId) => {
    setSidebarMode("summary");
    setSelectedPropertyId(propertyId);
  };

  const handleCalendarDateSelect = (dateContext) => {
    setSidebarMode("summary");
    handleDateSelect(dateContext);
  };

  const activeErrorMessage = listingsError || detailsError;
  const isCalendarLoading =
    isLoadingListings ||
    isLoadingDetails ||
    (Boolean(selectedPropertyId) && isLoadingCalendarSync);
  const calendarLoadingMessage = isLoadingListings
    ? "Loading accommodations..."
    : "Fetching accommodation info...";
  const isSidebarLoading =
    isLoadingListings ||
    (Boolean(selectedPropertyId) && (isLoadingDetails || isLoadingCalendarSync));
  const sidebarLoadingMessage = isLoadingListings
    ? "Loading accommodations..."
    : "Fetching accommodation info...";

  return (
    <section className="hc-page">
      <h1 className="hc-title">Calendar & Pricing</h1>

      {activeErrorMessage && <p className="hc-alert hc-alert--error">{activeErrorMessage}</p>}
      {!isLoadingListings && listingOptions.length === 0 && !activeErrorMessage && (
        <p className="hc-empty-state">No listings were found for this host account.</p>
      )}

      <div className="hc-layout">
        <div className="hc-main">
          <Toolbar
            view={view}
            onViewChange={setView}
            onToday={today}
            listingOptions={listingOptions}
            selectedPropertyId={selectedPropertyId}
            onSelectProperty={handleSelectProperty}
            isLoadingListings={isLoadingListings}
          />

          <CalendarGrid
            view={view}
            cursor={cursor}
            monthGrid={monthGrid}
            onPrev={prev}
            onNext={next}
            availabilityRanges={availabilityRanges}
            externalBlockedDates={externalBlockedDates}
            nightlyRate={pricingSnapshot.nightlyRate}
            weekendRate={pricingSnapshot.weekendRate}
            isLoading={isCalendarLoading}
            loadingMessage={calendarLoadingMessage}
            selectedDateKeys={selectedDateKeys}
            pendingSelectionStartKey={pendingSelectionStartKey}
            availabilityOverrides={availabilityOverrides}
            priceOverrides={selectedPropertyPriceOverrides}
            bookedDateKeys={bookedDateKeys}
            onDateSelect={handleCalendarDateSelect}
          />
        </div>

        <aside className="hc-sidebar">
          <HostCalendarSidebar
            isSidebarLoading={isSidebarLoading}
            sidebarLoadingMessage={sidebarLoadingMessage}
            selectedDateKeys={selectedDateKeys}
            selectedAvailabilityStats={selectedAvailabilityStats}
            handleToggleAvailability={handleToggleAvailability}
            selectionPriceInput={selectionPriceInput}
            handleSelectionPriceChange={handleSelectionPriceChange}
            selectionPriceDirty={selectionPriceDirty}
            canSaveSelectionPrice={canSaveSelectionPrice}
            handleSaveSelectionPrice={handleSaveSelectionPrice}
            sidebarMode={sidebarMode}
            normalizedPricingSettingsForm={normalizedPricingSettingsForm}
            pricingSnapshot={pricingSnapshot}
            pricingSettingsForm={pricingSettingsForm}
            weekendRateInput={weekendRateInput}
            updatePricingSettingsForm={updatePricingSettingsForm}
            setWeekendRateInput={setWeekendRateInput}
            hasAnyPricingSettingsChanges={hasAnyPricingSettingsChanges}
            canSavePricingSettings={canSavePricingSettings}
            isSavingPricingSettings={isSavingPricingSettings}
            pricingSettingsSaveError={pricingSettingsSaveError}
            handleSavePricingSettings={handleSavePricingSettings}
            availabilitySettingsForm={availabilitySettingsForm}
            availabilityWindowOptions={availabilityWindowOptions}
            updateAvailabilitySettingsForm={updateAvailabilitySettingsForm}
            hasAvailabilitySettingsChanges={hasAvailabilitySettingsChanges}
            canSaveAvailabilitySettings={canSaveAvailabilitySettings}
            isSavingAvailabilitySettings={isSavingAvailabilitySettings}
            availabilitySettingsSaveError={availabilitySettingsSaveError}
            handleSaveAvailabilitySettings={handleSaveAvailabilitySettings}
            hostCalendarExportUrl={hostCalendarExportUrl}
            calendarUrlInput={calendarUrlInput}
            calendarNameInput={calendarNameInput}
            calendarProviderInput={calendarProviderInput}
            updateCalendarSyncForm={updateCalendarSyncForm}
            handleCopyDomitsCalendarLink={handleCopyDomitsCalendarLink}
            domitsCalendarLinkCopied={domitsCalendarLinkCopied}
            handleAddCalendarSource={handleAddCalendarSource}
            canAddCalendarSource={canAddCalendarSource}
            isSavingCalendarSync={isSavingCalendarSync}
            calendarSyncError={calendarSyncError}
            isEditingCalendarSource={isEditingCalendarSource}
            calendarSources={calendarSources}
            handleEditCalendarSource={handleEditCalendarSource}
            editingCalendarSourceId={editingCalendarSourceId}
            handleCancelEditCalendarSource={handleCancelEditCalendarSource}
            handleRefreshCalendarSource={handleRefreshCalendarSource}
            refreshingCalendarSourceId={refreshingCalendarSourceId}
            sourceSyncStateById={sourceSyncStateById}
            handleRefreshAllCalendarSources={handleRefreshAllCalendarSources}
            isRefreshingAllCalendarSources={isRefreshingAllCalendarSources}
            handleRemoveCalendarSource={handleRemoveCalendarSource}
            removingCalendarSourceId={removingCalendarSourceId}
            handleCalendarSyncBack={handleCalendarSyncBack}
            setSidebarMode={setSidebarMode}
            openCalendarSync={openCalendarSync}
          />
        </aside>
      </div>
    </section>
  );
}
