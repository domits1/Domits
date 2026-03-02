import React, { useMemo, useState } from "react";
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
  } = useCalendarSync({ selectedPropertyId });

  const monthGrid = useMemo(() => getMonthMatrix(cursor), [cursor]);
  const availabilityRanges = useMemo(
    () => normalizeAvailabilityRanges(propertyDetails?.availability),
    [propertyDetails]
  );

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
          {isSidebarLoading ? (
            <section className="hc-sidebar-loading-card" aria-label="Loading pricing and availability">
              <PulseBarsLoader message={sidebarLoadingMessage} />
            </section>
          ) : selectedDateKeys.length > 0 ? (
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
          ) : sidebarMode === "pricing-settings" ? (
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
          ) : sidebarMode === "availability-settings" ? (
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
          ) : sidebarMode === "calendar-sync" ? (
            <CalendarSyncCard
              domitsCalendarLink={hostCalendarExportUrl}
              externalCalendarUrlInput={calendarUrlInput}
              calendarNameInput={calendarNameInput}
              calendarProviderInput={calendarProviderInput}
              onExternalCalendarUrlChange={(value) =>
                updateCalendarSyncForm({ calendarUrl: String(value || "") })
              }
              onCalendarNameChange={(value) =>
                updateCalendarSyncForm({ calendarName: String(value || "") })
              }
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
          ) : (
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
              <CalendarLinkCard
                connectedCount={calendarSources.length}
                onOpenSettings={openCalendarSync}
              />
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
