import React from "react";
import PropTypes from "prop-types";
import { dayNames, formatYearMonth, getMonthMatrix, isSameMonthUTC, monthNames } from "../utils/date";
import { cx } from "../utils/classNames";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import checkPng from "../../../../images/icons/checkPng.png";
import calendarUnavailablePng from "../../../../images/icons/calendar-unavailable.png";
import externalLinkIcon from "../../../../images/icons/external-link-icon.png";
import arrowLeftIcon from "../../../../images/arrow-left-icon.svg";
import arrowRightIcon from "../../../../images/arrow-right-icon.svg";

const formatEuroAmount = (amount) => `EUR ${Number(amount || 0).toLocaleString("en-US")}`;
const EMPTY_SET = new Set();
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const BOOLEAN_RESTRICTION_INDICATORS = [
  {
    field: "stopSell",
    label: "Stop selling this date",
    text: "Stop",
  },
  {
    field: "closedToArrival",
    label: "No check-in on this date",
    text: "No CI",
  },
  {
    field: "closedToDeparture",
    label: "No check-out on this date",
    text: "No CO",
  },
];
const STAY_RESTRICTION_INDICATORS = [
  {
    field: "minStay",
    labelPrefix: "Minimum stay",
    textPrefix: "Min",
  },
  {
    field: "maxStay",
    labelPrefix: "Maximum stay",
    textPrefix: "Max",
  },
];

const toDateNumber = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return Number(`${year}${month}${day}`);
};

const toDateKey = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const hasOverride = Object.hasOwn(availabilityOverrides, key);
  if (hasOverride) {
    return Boolean(availabilityOverrides[key]);
  }
  return null;
};

const readOverrideField = (source, camelField, snakeField) => {
  if (!source || typeof source !== "object") {
    return undefined;
  }
  return source[camelField] === undefined ? source[snakeField] : source[camelField];
};

const normalizeNullableBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }
  return null;
};

const normalizeNullableStay = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.trunc(parsed);
};

const readRestrictionOverride = (restrictionOverrides, key) => {
  const source =
    restrictionOverrides && typeof restrictionOverrides === "object" ? restrictionOverrides[key] : null;
  if (!source || typeof source !== "object") {
    return {
      stopSell: null,
      closedToArrival: null,
      closedToDeparture: null,
      minStay: null,
      maxStay: null,
    };
  }

  return {
    stopSell: normalizeNullableBoolean(readOverrideField(source, "stopSell", "stop_sell")),
    closedToArrival: normalizeNullableBoolean(
      readOverrideField(source, "closedToArrival", "closed_to_arrival")
    ),
    closedToDeparture: normalizeNullableBoolean(
      readOverrideField(source, "closedToDeparture", "closed_to_departure")
    ),
    minStay: normalizeNullableStay(readOverrideField(source, "minStay", "min_stay")),
    maxStay: normalizeNullableStay(readOverrideField(source, "maxStay", "max_stay")),
  };
};

const buildRestrictionIndicators = (restriction) => {
  const safeRestriction = restriction && typeof restriction === "object" ? restriction : {};
  const booleanIndicators = BOOLEAN_RESTRICTION_INDICATORS
    .filter(({ field }) => safeRestriction[field] === true)
    .map(({ field, label, text }) => ({ key: field, label, text }));
  const stayIndicators = STAY_RESTRICTION_INDICATORS
    .filter(({ field }) => {
      const value = safeRestriction[field];
      if (value === null || value === undefined) return false;
      // Hide "Min 1" — minimum stay of 1 is the default and adds visual noise
      if (field === "minStay" && value === 1) return false;
      return true;
    })
    .map(({ field, labelPrefix, textPrefix }) => ({
      key: field,
      label: `${labelPrefix} ${safeRestriction[field]}`,
      text: `${textPrefix} ${safeRestriction[field]}`,
    }));
  return [...booleanIndicators, ...stayIndicators];
};

const buildYearMonthViews = (year) => {
  const views = [];
  monthNames.forEach((monthName, monthIndex) => {
    const monthCursor = new Date(Date.UTC(year, monthIndex, 1));
    const rawMonthGrid = getMonthMatrix(monthCursor);
    const trimmedMonthGrid = rawMonthGrid.filter((weekRow) =>
      weekRow.some((date) => isSameMonthUTC(date, monthCursor))
    );
    views.push({
      monthName,
      monthCursor,
      monthGrid: trimmedMonthGrid.length > 0 ? trimmedMonthGrid : rawMonthGrid,
    });
  });
  return views;
};

const getUtcTodayParts = () => {
  const today = new Date();
  return {
    year: today.getUTCFullYear(),
    month: today.getUTCMonth(),
    day: today.getUTCDate(),
  };
};

const buildCellAriaLabel = ({
  date,
  displayPrice,
  showExternalBlockedOverlay,
  isSelected,
  isPending,
  restrictionIndicators,
}) => {
  const hasDisplayPrice = displayPrice !== null;
  return [
    date.toUTCString(),
    hasDisplayPrice ? `${formatEuroAmount(displayPrice)} per night` : null,
    showExternalBlockedOverlay ? "external booking" : null,
    ...(Array.isArray(restrictionIndicators) ? restrictionIndicators.map((indicator) => indicator.label) : []),
    isSelected ? "selected" : null,
    isPending ? "pending selection" : null,
  ]
    .filter(Boolean)
    .join(", ");
};

const buildDayPresentation = ({
  date,
  monthCursor,
  blockedDates,
  bookedSet,
  selectedSet,
  pendingSelectionStartKey,
  availabilityOverrides,
  restrictionOverrides,
  availabilityRanges,
  dayPriceOverrides,
  nightlyRate,
  weekendRate,
  todayUtc,
}) => {
  const dateNumber = toDateNumber(date);
  const inCurrentMonth = isSameMonthUTC(date, monthCursor);
  const key = toDateKey(date);
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  const isBlocked = blockedDates.has(key);
  const isBooked = bookedSet.has(key);
  const overrideAvailability = readOverrideAvailability(availabilityOverrides, key);
  const restrictionOverride = readRestrictionOverride(restrictionOverrides, key);
  const restrictionIndicators = buildRestrictionIndicators(restrictionOverride);
  const isAvailable =
    !isBlocked && !isBooked && (overrideAvailability ?? isDateWithinAvailability(dateNumber, availabilityRanges));
  const isUnavailable = !isAvailable;
  const isForcedUnavailable = overrideAvailability === false;
  const isSelected = selectedSet.has(key);
  const isPending = pendingSelectionStartKey === key;
  const isToday =
    todayUtc.year === date.getUTCFullYear() &&
    todayUtc.month === date.getUTCMonth() &&
    todayUtc.day === date.getUTCDate();

  const overridePrice = Number(dayPriceOverrides[key]);
  const defaultPrice = isWeekend ? weekendRate : nightlyRate;
  const hasValidOverridePrice = Number.isFinite(overridePrice) && overridePrice > 0;
  let displayPrice = null;
  if (!isBlocked) {
    displayPrice = hasValidOverridePrice ? Math.trunc(overridePrice) : defaultPrice;
  }

  const showExternalBlockedOverlay = isBlocked && !isBooked;
  const showUnavailableBadge = !showExternalBlockedOverlay && !isBooked && (isBlocked || isUnavailable);

  return {
    key,
    isOutsideMonth: !inCurrentMonth,
    isToday,
    isBlocked,
    isBooked,
    isAvailable,
    isUnavailable,
    isForcedUnavailable,
    isSelected,
    isPending,
    showExternalBlockedOverlay,
    showUnavailableBadge,
    showBookedBadge: inCurrentMonth && isBooked,
    showExternalBlockedYearIcon: isBlocked && !isBooked,
    showUnavailableYearIcon: !isBlocked && !isBooked && isUnavailable,
    showBookedYearIcon: isBooked,
    displayPrice,
    restrictionIndicators,
    cellAriaLabel: buildCellAriaLabel({
      date,
      displayPrice,
      showExternalBlockedOverlay,
      isSelected,
      isPending,
      restrictionIndicators,
    }),
    dayNumber: date.getUTCDate(),
  };
};

export default function CalendarGrid({
  view,
  cursor,
  monthGrid,
  onPrev,
  onNext,
  availabilityRanges = EMPTY_ARRAY,
  externalBlockedDates = EMPTY_SET,
  nightlyRate = 0,
  weekendRate = 0,
  isLoading = false,
  selectedDateKeys = EMPTY_ARRAY,
  pendingSelectionStartKey = null,
  availabilityOverrides = EMPTY_OBJECT,
  restrictionOverrides = EMPTY_OBJECT,
  priceOverrides = EMPTY_OBJECT,
  priceLabsOverrides = EMPTY_OBJECT,
  bookedDateKeys = EMPTY_SET,
  onDateSelect = null,
  loadingMessage = "",
}) {
  const isMonthView = view === "month";
  const safeGrid = Array.isArray(monthGrid) ? monthGrid : [];
  const blockedDates = externalBlockedDates instanceof Set ? externalBlockedDates : new Set();
  const selectedSet = new Set(Array.isArray(selectedDateKeys) ? selectedDateKeys : []);
  const bookedSet = bookedDateKeys instanceof Set ? bookedDateKeys : new Set();
  const dayPriceOverrides = priceOverrides && typeof priceOverrides === "object" ? priceOverrides : {};
  const currentYear = cursor.getUTCFullYear();
  const todayUtc = React.useMemo(() => getUtcTodayParts(), []);

  const yearMonthViews = React.useMemo(() => buildYearMonthViews(currentYear), [currentYear]);

  const getDayPresentation = React.useCallback(
    (date, monthCursor) =>
      buildDayPresentation({
        date,
        monthCursor,
        blockedDates,
        bookedSet,
        selectedSet,
        pendingSelectionStartKey,
        availabilityOverrides,
        restrictionOverrides,
        availabilityRanges,
        dayPriceOverrides,
        nightlyRate,
        weekendRate,
        todayUtc,
      }),
    [
      blockedDates,
      bookedSet,
      selectedSet,
      pendingSelectionStartKey,
      availabilityOverrides,
      restrictionOverrides,
      availabilityRanges,
      dayPriceOverrides,
      nightlyRate,
      weekendRate,
      todayUtc,
    ]
  );

  const headerTitle = isMonthView ? formatYearMonth(cursor) : String(currentYear);
  const previousPeriodLabel = isMonthView ? "Previous month" : "Previous year";
  const nextPeriodLabel = isMonthView ? "Next month" : "Next year";
  const navigationGroupLabel = isMonthView ? "Month navigation" : "Year navigation";

  return (
    <section className="hc-calendar-panel" aria-label="Calendar and nightly prices">
      <header className="hc-calendar-head">
        <h2 className="hc-calendar-title">{headerTitle}</h2>
        <nav className="hc-calendar-nav" aria-label={navigationGroupLabel}>
          <button type="button" className="hc-nav-button" onClick={onPrev} aria-label={previousPeriodLabel}>
            <img src={arrowLeftIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
          <button type="button" className="hc-nav-button" onClick={onNext} aria-label={nextPeriodLabel}>
            <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
          </button>
        </nav>
      </header>

      {isMonthView ? (
        <>
          <div className="hc-week-header">
            {dayNames.map((dayName) => (
              <div key={dayName} className="hc-week-header-cell">
                {dayName}
              </div>
            ))}
          </div>

          <div className="hc-calendar-grid">
            {safeGrid.flat().map((date) => {
              const dayPresentation = getDayPresentation(date, cursor);
              const restrictionIndicators = Array.isArray(dayPresentation.restrictionIndicators)
                ? dayPresentation.restrictionIndicators
                : EMPTY_ARRAY;

              return (
                <button
                  type="button"
                  key={dayPresentation.key}
                  className={cx(
                    "hc-cell",
                    dayPresentation.isOutsideMonth && "hc-cell--outside",
                    dayPresentation.isToday && "hc-cell--today",
                    dayPresentation.isBlocked && "hc-cell--blocked",
                    dayPresentation.showExternalBlockedOverlay && "hc-cell--external-booking",
                    dayPresentation.isBooked && "hc-cell--booked",
                    dayPresentation.isAvailable && "hc-cell--available",
                    dayPresentation.isBlocked === false &&
                      dayPresentation.isUnavailable &&
                      "hc-cell--unavailable",
                    dayPresentation.isForcedUnavailable && "hc-cell--forced-unavailable",
                    dayPresentation.isPending && "hc-cell--pending",
                    dayPresentation.isSelected && dayPresentation.isAvailable && "hc-cell--selected",
                    dayPresentation.isSelected &&
                      dayPresentation.isUnavailable &&
                      "hc-cell--selected-unavailable",
                    dayPresentation.isSelected && "hc-cell--selected-outline"
                  )}
                  aria-label={dayPresentation.cellAriaLabel}
                  aria-pressed={dayPresentation.isSelected}
                  onClick={() => onDateSelect?.({ key: dayPresentation.key })}
                >
                  {dayPresentation.showExternalBlockedOverlay && (
                    <div className="hc-cell-external-booking" aria-label="External booking">
                      <span className="hc-cell-external-booking-icon" aria-hidden="true">
                        <img src={externalLinkIcon} alt="" />
                      </span>
                      <span className="hc-cell-external-booking-label">External booking</span>
                    </div>
                  )}

                  {dayPresentation.showUnavailableBadge && (
                    <span className="hc-cell-badge hc-cell-badge--unavailable" aria-label="Unavailable">
                      <img src={calendarUnavailablePng} alt="" />
                    </span>
                  )}

                  {dayPresentation.showBookedBadge && (
                    <span className="hc-cell-badge hc-cell-badge--booked" aria-label="Booked">
                      <img src={checkPng} alt="" />
                    </span>
                  )}

                  <span className="hc-cell-date">{dayPresentation.dayNumber}</span>
                  {dayPresentation.displayPrice !== null && (
                    <span className="hc-cell-price">{formatEuroAmount(dayPresentation.displayPrice)}</span>
                  )}

                  {(() => {
                    const plPrice = priceLabsOverrides?.[dayPresentation.key];
                    return plPrice > 0 ? (
                      <span className="hc-cell-pricelabs-suggestion" title="PriceLabs suggested price">
                        PL {formatEuroAmount(plPrice)}
                      </span>
                    ) : null;
                  })()}

                  {restrictionIndicators.length > 0 ? (
                    <span className="hc-cell-restrictions" aria-hidden="true">
                      {restrictionIndicators.map((indicator) => (
                        <span
                          key={indicator.key}
                          className={`hc-cell-restriction-chip hc-cell-restriction-chip--${indicator.key}`}
                          title={indicator.label}
                        >
                          {indicator.text}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="hc-year-grid" aria-label={`Year ${currentYear} overview`}>
          {yearMonthViews.map((monthView) => (
            <section key={monthView.monthName} className="hc-year-month">
              <h3 className="hc-year-month-title">{monthView.monthName}</h3>
              <div className="hc-year-week-header">
                {dayNames.map((dayName) => (
                  <span key={`${monthView.monthName}-${dayName}`} className="hc-year-week-header-cell">
                    {dayName.slice(0, 1)}
                  </span>
                ))}
              </div>
              <div className="hc-year-days">
                {monthView.monthGrid.flat().map((date) => {
                  const dayPresentation = getDayPresentation(date, monthView.monthCursor);
                  const isOutsideMonth = dayPresentation.isOutsideMonth;
                  const isCurrentMonth = !isOutsideMonth;
                  const restrictionIndicators = Array.isArray(dayPresentation.restrictionIndicators)
                    ? dayPresentation.restrictionIndicators
                    : EMPTY_ARRAY;
                  return (
                    <div
                      key={`${monthView.monthName}-${dayPresentation.key}`}
                      className={cx(
                        "hc-year-day",
                        isOutsideMonth && "hc-year-day--outside",
                        isCurrentMonth && dayPresentation.isToday && "hc-year-day--today",
                        isCurrentMonth &&
                          dayPresentation.showExternalBlockedOverlay &&
                          "hc-year-day--external-booking",
                        isCurrentMonth && dayPresentation.isBooked && "hc-year-day--booked",
                        isCurrentMonth &&
                          dayPresentation.isForcedUnavailable &&
                          "hc-year-day--forced-unavailable",
                        isCurrentMonth &&
                          dayPresentation.isBlocked === false &&
                          dayPresentation.isUnavailable &&
                          "hc-year-day--unavailable",
                        isCurrentMonth && dayPresentation.isAvailable && "hc-year-day--available",
                        isCurrentMonth &&
                          restrictionIndicators.length > 0 &&
                          "hc-year-day--has-restrictions",
                        isCurrentMonth && dayPresentation.isSelected && "hc-year-day--selected"
                      )}
                      aria-hidden={isOutsideMonth}
                      aria-label={isOutsideMonth ? undefined : dayPresentation.cellAriaLabel}
                    >
                      {isCurrentMonth ? (
                        <>
                          <span className="hc-year-day-number">{dayPresentation.dayNumber}</span>

                          {dayPresentation.showExternalBlockedYearIcon && (
                            <span className="hc-year-day-icon hc-year-day-icon--external" aria-hidden="true">
                              <img src={externalLinkIcon} alt="" />
                            </span>
                          )}

                          {dayPresentation.showUnavailableYearIcon && (
                            <span className="hc-year-day-icon hc-year-day-icon--unavailable" aria-hidden="true">
                              <img src={calendarUnavailablePng} alt="" />
                            </span>
                          )}

                          {dayPresentation.showBookedYearIcon && (
                            <span className="hc-year-day-icon hc-year-day-icon--booked" aria-hidden="true">
                              <img src={checkPng} alt="" />
                            </span>
                          )}

                          {restrictionIndicators.length > 0 && (
                            <span className="hc-year-day-restriction-dot" aria-hidden="true" />
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="hc-calendar-loading">
          <PulseBarsLoader message={loadingMessage || "Fetching accommodation info..."} />
        </div>
      )}
    </section>
  );
}

CalendarGrid.propTypes = {
  view: PropTypes.string.isRequired,
  cursor: PropTypes.instanceOf(Date).isRequired,
  monthGrid: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.instanceOf(Date))).isRequired,
  onPrev: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  availabilityRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      end: PropTypes.number.isRequired,
    })
  ),
  externalBlockedDates: PropTypes.instanceOf(Set),
  nightlyRate: PropTypes.number,
  weekendRate: PropTypes.number,
  isLoading: PropTypes.bool,
  selectedDateKeys: PropTypes.arrayOf(PropTypes.string),
  pendingSelectionStartKey: PropTypes.string,
  availabilityOverrides: PropTypes.objectOf(PropTypes.bool),
  restrictionOverrides: PropTypes.objectOf(
    PropTypes.shape({
      stopSell: PropTypes.bool,
      closedToArrival: PropTypes.bool,
      closedToDeparture: PropTypes.bool,
      minStay: PropTypes.number,
      maxStay: PropTypes.number,
    })
  ),
  priceOverrides: PropTypes.objectOf(PropTypes.number),
  priceLabsOverrides: PropTypes.objectOf(PropTypes.number),
  bookedDateKeys: PropTypes.instanceOf(Set),
  onDateSelect: PropTypes.func,
  loadingMessage: PropTypes.string,
};
