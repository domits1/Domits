import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import {
  buildUnavailableDateSet,
  DATE_AVAILABILITY_REASONS,
  getDateAvailabilityReason,
  getStayRangeAvailabilityIssue,
  normalizeDateValue,
  toDateKey,
} from "../utils/dateAvailability";
import "../styles/RangeCalendar.scss";

const BOOKED_MESSAGE = "These dates are already booked.";
const NO_AVAILABILITY_MESSAGE = "This property has no availability for the selected dates.";
const makeDate = (year, month, day) => new Date(year, month, day);
const addMonths = (date, offset) => makeDate(date.getFullYear(), date.getMonth() + offset, 1);

const startOfCalendar = (year, month) => {
  const first = makeDate(year, month, 1);
  const day = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - day);
  return gridStart;
};

const weekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthLabel = (date) => date.toLocaleString(undefined, { month: "long", year: "numeric" });
const formatRangeDate = (date) =>
  date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const isSameDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

function MonthGrid({
  viewMonth,
  rangeStart = null,
  rangeEnd = null,
  onPick,
  navigation = null,
  blockedDateKeys,
  bookedDateKeys,
  externalBlockedDateKeys,
  availabilityRanges,
  availableDateKeys,
}) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const today = new Date();

  const cells = useMemo(() => {
    const start = startOfCalendar(year, month);
    const items = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const inMonth = date.getMonth() === month;
      const key = toDateKey(date);
      const availabilityReason = inMonth
        ? getDateAvailabilityReason(date, blockedDateKeys, {
            availabilityRanges,
            availableDateKeys,
            bookedDateKeys,
            externalBlockedDateKeys,
          })
        : DATE_AVAILABILITY_REASONS.AVAILABLE;
      const isBooked = availabilityReason === DATE_AVAILABILITY_REASONS.BOOKED;
      const isExternalBlocked = availabilityReason === DATE_AVAILABILITY_REASONS.EXTERNAL_BLOCKED;
      const isOutsideWindow = availabilityReason === DATE_AVAILABILITY_REASONS.OUTSIDE_WINDOW;
      const isUnavailableOverride = availabilityReason === DATE_AVAILABILITY_REASONS.UNAVAILABLE_OVERRIDE;
      const isUnavailable = inMonth && availabilityReason !== DATE_AVAILABILITY_REASONS.AVAILABLE;
      const inRange = rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd && inMonth;
      const isStart = rangeStart && key === toDateKey(rangeStart);
      const isEnd = rangeEnd && key === toDateKey(rangeEnd);
      const isToday = inMonth && isSameDay(date, today);
      items.push({
        date,
        key,
        inMonth,
        inRange,
        isStart,
        isEnd,
        isUnavailable,
        isBooked,
        isExternalBlocked,
        isOutsideWindow,
        isUnavailableOverride,
        isToday,
      });
    }

    return items;
  }, [
    availabilityRanges,
    availableDateKeys,
    blockedDateKeys,
    bookedDateKeys,
    externalBlockedDateKeys,
    month,
    rangeEnd,
    rangeStart,
    today,
    year,
  ]);

  return (
    <div className="rc-month">
      <div className="rc-month__topline">
        {navigation?.side === "left" && (
          <button type="button" className="rc-month__arrow" aria-label="Previous month" onClick={navigation.onClick}>
            <span className="rc-chevron rc-chevron--left" />
          </button>
        )}
        <div className="rc-month__label">{monthLabel(viewMonth)}</div>
        {navigation?.side === "right" && (
          <button type="button" className="rc-month__arrow" aria-label="Next month" onClick={navigation.onClick}>
            <span className="rc-chevron rc-chevron--right" />
          </button>
        )}
      </div>

      <div className="rc-grid rc-grid--head">
        {weekdayLabels.map((weekday) => (
          <div key={weekday} className="rc-cell rc-cell--head">
            {weekday}
          </div>
        ))}
      </div>

      <div className="rc-grid rc-grid--body">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return <div key={cell.key} className="rc-cell rc-cell--day is-out is-empty" aria-hidden="true" />;
          }

          return (
            <button
              key={cell.key}
              type="button"
              className={[
                "rc-cell rc-cell--day",
                cell.isUnavailable && !cell.isBooked && "is-unavailable range-calendar__day--unavailable",
                cell.isBooked && "is-booked range-calendar__day--booked",
                cell.isExternalBlocked && "range-calendar__day--external-blocked",
                cell.isOutsideWindow && "range-calendar__day--outside-window",
                cell.isUnavailableOverride && "range-calendar__day--unavailable-override",
                cell.inRange && "is-inrange",
                cell.isStart && "is-start",
                cell.isEnd && "is-end",
                cell.isToday && "is-today",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-label={formatRangeDate(cell.date)}
              disabled={cell.isUnavailable}
              onClick={() => onPick(cell.date)}
            >
              <span>{cell.date.getDate()}</span>
              {cell.isBooked ? <span className="rc-cell__booked-mark">Booked</span> : null}
              {cell.isUnavailable && !cell.isBooked ? (
                <span className="rc-cell__unavailable-mark" aria-hidden="true">--</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

MonthGrid.propTypes = {
  viewMonth: PropTypes.instanceOf(Date).isRequired,
  rangeStart: PropTypes.instanceOf(Date),
  rangeEnd: PropTypes.instanceOf(Date),
  onPick: PropTypes.func.isRequired,
  blockedDateKeys: PropTypes.instanceOf(Set).isRequired,
  availabilityRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      end: PropTypes.number.isRequired,
    })
  ),
  availableDateKeys: PropTypes.instanceOf(Set),
  bookedDateKeys: PropTypes.instanceOf(Set).isRequired,
  externalBlockedDateKeys: PropTypes.instanceOf(Set).isRequired,
  navigation: PropTypes.shape({
    side: PropTypes.oneOf(["left", "right"]),
    onClick: PropTypes.func,
  }),
};

export default function RangeCalendar({
  unavailableDateKeys = [],
  bookedDateKeys = [],
  externalBlockedDateKeys = [],
  availabilityRanges = null,
  availableDateKeys = null,
  checkInDate = "",
  checkOutDate = "",
  onRangeChange,
}) {
  const now = new Date();
  const initialMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [view, setView] = useState(initialMonth);
  const [draftStart, setDraftStart] = useState(null);
  const [selectionError, setSelectionError] = useState("");
  const rangeStart = useMemo(() => normalizeDateValue(checkInDate), [checkInDate]);
  const rangeEnd = useMemo(() => normalizeDateValue(checkOutDate), [checkOutDate]);

  const blockedDateKeys = useMemo(() => buildUnavailableDateSet(unavailableDateKeys), [unavailableDateKeys]);
  const bookedDateKeySet = useMemo(() => buildUnavailableDateSet(bookedDateKeys), [bookedDateKeys]);
  const externalBlockedDateKeySet = useMemo(
    () => buildUnavailableDateSet(externalBlockedDateKeys),
    [externalBlockedDateKeys]
  );
  const availableDateKeySet = useMemo(
    () => (Array.isArray(availableDateKeys) ? buildUnavailableDateSet(availableDateKeys) : null),
    [availableDateKeys]
  );
  const availabilityContext = useMemo(
    () => ({
      availabilityRanges,
      availableDateKeys: availableDateKeySet,
      bookedDateKeys: bookedDateKeySet,
      externalBlockedDateKeys: externalBlockedDateKeySet,
    }),
    [availabilityRanges, availableDateKeySet, bookedDateKeySet, externalBlockedDateKeySet]
  );

  const rightMonth = useMemo(() => addMonths(view, 1), [view]);

  const next = () => setView((value) => addMonths(value, 1));
  const prev = () => setView((value) => addMonths(value, -1));

  useEffect(() => {
    setDraftStart(rangeStart && !rangeEnd ? rangeStart : null);
  }, [rangeEnd, rangeStart]);

  const handlePick = (date) => {
    const key = toDateKey(date);
    const availabilityReason = getDateAvailabilityReason(date, blockedDateKeys, availabilityContext);
    if (availabilityReason !== DATE_AVAILABILITY_REASONS.AVAILABLE) {
      setSelectionError(
        availabilityReason === DATE_AVAILABILITY_REASONS.BOOKED ? BOOKED_MESSAGE : NO_AVAILABILITY_MESSAGE
      );
      return;
    }
    setSelectionError("");

    const anchorDate = draftStart || rangeStart;

    if (!anchorDate || rangeEnd) {
      setDraftStart(date);
      onRangeChange(key, "");
      return;
    }

    const nextStart = anchorDate.getTime() <= date.getTime() ? anchorDate : date;
    const nextEnd = anchorDate.getTime() <= date.getTime() ? date : anchorDate;

    const rangeIssue = getStayRangeAvailabilityIssue(nextStart, nextEnd, blockedDateKeys, availabilityContext);
    if (rangeIssue) {
      setSelectionError(rangeIssue === DATE_AVAILABILITY_REASONS.BOOKED ? BOOKED_MESSAGE : NO_AVAILABILITY_MESSAGE);
      setDraftStart(date);
      onRangeChange(key, "");
      return;
    }

    setDraftStart(null);
    onRangeChange(toDateKey(nextStart), toDateKey(nextEnd));
  };

  const rangeLabel =
    rangeStart && rangeEnd
      ? `${formatRangeDate(rangeStart)} - ${formatRangeDate(rangeEnd)}`
      : "Select your stay dates";

  return (
    <section className="availability-section">
      <div className="availability-section__header">
        <div className="availability-section__title-row">
          <span className="availability-section__icon" aria-hidden="true">
            <FaCalendarAlt />
          </span>
          <h3 className="availability-section__title">Availability</h3>
        </div>
        <p className="availability-section__range">{rangeLabel}</p>
        {selectionError ? (
          <p className="availability-section__error" role="alert">
            {selectionError}
          </p>
        ) : null}
      </div>

      <div className="rc-con">
        <div className="rc">
          <div className="rc-panels">
            <MonthGrid
              viewMonth={view}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPick={handlePick}
              blockedDateKeys={blockedDateKeys}
              bookedDateKeys={bookedDateKeySet}
              externalBlockedDateKeys={externalBlockedDateKeySet}
              availabilityRanges={availabilityRanges}
              availableDateKeys={availableDateKeySet}
              navigation={{ side: "left", onClick: prev }}
            />
            <MonthGrid
              viewMonth={rightMonth}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPick={handlePick}
              blockedDateKeys={blockedDateKeys}
              bookedDateKeys={bookedDateKeySet}
              externalBlockedDateKeys={externalBlockedDateKeySet}
              availabilityRanges={availabilityRanges}
              availableDateKeys={availableDateKeySet}
              navigation={{ side: "right", onClick: next }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

RangeCalendar.propTypes = {
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  bookedDateKeys: PropTypes.arrayOf(PropTypes.string),
  externalBlockedDateKeys: PropTypes.arrayOf(PropTypes.string),
  availabilityRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      end: PropTypes.number.isRequired,
    })
  ),
  availableDateKeys: PropTypes.arrayOf(PropTypes.string),
  checkInDate: PropTypes.string,
  checkOutDate: PropTypes.string,
  onRangeChange: PropTypes.func.isRequired,
};
