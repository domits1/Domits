import React from "react";
import { dayNames, formatYearMonth, isSameMonthUTC } from "../utils/date";
import { cx } from "../utils/classNames";
import PulseBarsLoader from "./PulseBarsLoader";
import checkPng from "../../../../images/icons/checkPng.png";
import calendarUnavailablePng from "../../../../images/icons/calendar-unavailable.png";
import arrowLeftIcon from "../../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../../images/arrow-right-icon.svg";

const formatEuroAmount = (amount) => `EUR ${Number(amount || 0).toLocaleString("en-US")}`;

const toDateNumber = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
};

const isDateWithinAvailability = (dateNumber, ranges) => {
  const safeRanges = Array.isArray(ranges) ? ranges : [];
  if (safeRanges.length === 0) {
    return true;
  }
  return safeRanges.some((range) => dateNumber >= range.start && dateNumber <= range.end);
};

const readOverrideAvailability = (availabilityOverrides, key) => {
  if (!availabilityOverrides || typeof availabilityOverrides !== "object") {
    return null;
  }
  if (!Object.hasOwn(availabilityOverrides, key)) {
    return null;
  }
  return Boolean(availabilityOverrides[key]);
};

export default function CalendarGrid({
  view,
  cursor,
  monthGrid,
  onPrev,
  onNext,
  availabilityRanges,
  externalBlockedDates,
  nightlyRate,
  weekendRate,
  isLoading,
  selectedDateKeys,
  pendingSelectionStartKey,
  availabilityOverrides,
  priceOverrides,
  bookedDateKeys,
  onDateSelect,
  loadingMessage,
}) {
  const safeGrid = Array.isArray(monthGrid) ? monthGrid : [];
  const blockedDates = externalBlockedDates instanceof Set ? externalBlockedDates : new Set();
  const selectedSet = new Set(Array.isArray(selectedDateKeys) ? selectedDateKeys : []);
  const bookedSet = bookedDateKeys instanceof Set ? bookedDateKeys : new Set();
  const dayPriceOverrides = priceOverrides && typeof priceOverrides === "object" ? priceOverrides : {};

  return (
    <section className="hc-calendar-panel" aria-label="Calendar and nightly prices">
      <header className="hc-calendar-head">
        <h2 className="hc-calendar-title">{formatYearMonth(cursor)}</h2>
        <div className="hc-calendar-nav" role="group" aria-label="Month navigation">
          <button type="button" className="hc-nav-button" onClick={onPrev} aria-label="Previous month">
            <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
          <button type="button" className="hc-nav-button" onClick={onNext} aria-label="Next month">
            <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
        </div>
      </header>

      {view !== "month" ? (
        <div className="hc-calendar-placeholder">Year view will be added in a follow-up iteration.</div>
      ) : (
        <>
          <div className="hc-week-header" role="presentation">
            {dayNames.map((dayName) => (
              <div key={dayName} className="hc-week-header-cell">
                {dayName}
              </div>
            ))}
          </div>

          <div className="hc-calendar-grid">
            {safeGrid.flat().map((date) => {
              const dateNumber = toDateNumber(date);
              const inCurrentMonth = isSameMonthUTC(date, cursor);
              const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
                date.getUTCDate()
              ).padStart(2, "0")}`;

              const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
              const isBlocked = blockedDates.has(key);
              const isBooked = bookedSet.has(key);
              const overrideAvailability = readOverrideAvailability(availabilityOverrides, key);
              const isAvailable =
                !isBlocked &&
                !isBooked &&
                (overrideAvailability ?? isDateWithinAvailability(dateNumber, availabilityRanges));
              const isForcedUnavailable = overrideAvailability === false;
              const isSelected = selectedSet.has(key);
              const isPending = pendingSelectionStartKey === key;

              const today = new Date();
              const isToday =
                today.getUTCFullYear() === date.getUTCFullYear() &&
                today.getUTCMonth() === date.getUTCMonth() &&
                today.getUTCDate() === date.getUTCDate();

              const overridePrice = Number(dayPriceOverrides[key]);
              const defaultPrice = isWeekend ? weekendRate : nightlyRate;
              const displayPrice = !isBlocked
                ? Number.isFinite(overridePrice) && overridePrice > 0
                  ? Math.trunc(overridePrice)
                  : defaultPrice
                : null;

              const showUnavailableBadge = !isBooked && (isBlocked || !isAvailable);
              const showBookedBadge = inCurrentMonth && isBooked;

              return (
                <article
                  key={key}
                  className={cx(
                    "hc-cell",
                    !inCurrentMonth && "hc-cell--outside",
                    isToday && "hc-cell--today",
                    isBlocked && "hc-cell--blocked",
                    isBooked && "hc-cell--booked",
                    isAvailable && "hc-cell--available",
                    !isBlocked && !isAvailable && "hc-cell--unavailable",
                    isForcedUnavailable && "hc-cell--forced-unavailable",
                    isPending && "hc-cell--pending",
                    isSelected && isAvailable && "hc-cell--selected",
                    isSelected && !isAvailable && "hc-cell--selected-unavailable",
                    isSelected && "hc-cell--selected-outline"
                  )}
                  aria-label={`${date.toUTCString()}${displayPrice !== null ? `, ${formatEuroAmount(displayPrice)} per night` : ""}${isSelected ? ", selected" : ""}${isPending ? ", pending selection" : ""}`}
                  onClick={() => onDateSelect?.({ key })}
                >
                  {showUnavailableBadge && (
                    <span className="hc-cell-badge hc-cell-badge--unavailable" aria-label="Unavailable">
                      <img src={calendarUnavailablePng} alt="" />
                    </span>
                  )}

                  {showBookedBadge && (
                    <span className="hc-cell-badge hc-cell-badge--booked" aria-label="Booked">
                      <img src={checkPng} alt="" />
                    </span>
                  )}

                  <span className="hc-cell-date">{date.getUTCDate()}</span>
                  {displayPrice !== null && <span className="hc-cell-price">{formatEuroAmount(displayPrice)}</span>}
                </article>
              );
            })}
          </div>
        </>
      )}

      {isLoading && (
        <div className="hc-calendar-loading">
          <PulseBarsLoader message={loadingMessage || "Fetching accommodation info..."} />
        </div>
      )}
    </section>
  );
}
