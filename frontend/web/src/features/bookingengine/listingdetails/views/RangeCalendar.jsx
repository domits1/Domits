import PropTypes from "prop-types";
import React, { useEffect, useMemo, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import {
  buildUnavailableDateSet,
  hasUnavailableDateInStayRange,
  normalizeDateValue,
  toDateKey,
} from "../utils/dateAvailability";
import "../styles/RangeCalendar.scss";

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

function MonthGrid({
  viewMonth,
  rangeStart = null,
  rangeEnd = null,
  onPick,
  navigation = null,
  blockedDateKeys,
}) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const cells = useMemo(() => {
    const start = startOfCalendar(year, month);
    const items = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const inMonth = date.getMonth() === month;
      const key = toDateKey(date);
      const isUnavailable = inMonth && blockedDateKeys.has(key);
      const inRange = rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd && inMonth;
      const isStart = rangeStart && key === toDateKey(rangeStart);
      const isEnd = rangeEnd && key === toDateKey(rangeEnd);
      items.push({ date, key, inMonth, inRange, isStart, isEnd, isUnavailable });
    }

    return items;
  }, [blockedDateKeys, month, rangeEnd, rangeStart, year]);

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
        {cells.map((cell) => (
          <button
            key={cell.key}
            type="button"
            className={[
              "rc-cell rc-cell--day",
              !cell.inMonth && "is-out",
              cell.isUnavailable && "is-unavailable",
              cell.inRange && "is-inrange",
              cell.isStart && "is-start",
              cell.isEnd && "is-end",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={formatRangeDate(cell.date)}
            disabled={!cell.inMonth || cell.isUnavailable}
            onClick={() => onPick(cell.date)}
          >
            <span>{cell.date.getDate()}</span>
          </button>
        ))}
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
  navigation: PropTypes.shape({
    side: PropTypes.oneOf(["left", "right"]),
    onClick: PropTypes.func,
  }),
};

export default function RangeCalendar({
  unavailableDateKeys = [],
  checkInDate = "",
  checkOutDate = "",
  onRangeChange,
}) {
  const now = new Date();
  const initialMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [view, setView] = useState(initialMonth);
  const [draftStart, setDraftStart] = useState(null);
  const rangeStart = useMemo(() => normalizeDateValue(checkInDate), [checkInDate]);
  const rangeEnd = useMemo(() => normalizeDateValue(checkOutDate), [checkOutDate]);

  const blockedDateKeys = useMemo(() => buildUnavailableDateSet(unavailableDateKeys), [unavailableDateKeys]);

  const rightMonth = useMemo(() => addMonths(view, 1), [view]);

  const next = () => setView((value) => addMonths(value, 1));
  const prev = () => setView((value) => addMonths(value, -1));

  useEffect(() => {
    setDraftStart(rangeStart && !rangeEnd ? rangeStart : null);
  }, [rangeEnd, rangeStart]);

  const handlePick = (date) => {
    const key = toDateKey(date);
    if (blockedDateKeys.has(key)) {
      return;
    }

    const anchorDate = draftStart || rangeStart;

    if (!anchorDate || rangeEnd) {
      setDraftStart(date);
      onRangeChange(key, "");
      return;
    }

    const nextStart = anchorDate.getTime() <= date.getTime() ? anchorDate : date;
    const nextEnd = anchorDate.getTime() <= date.getTime() ? date : anchorDate;

    if (hasUnavailableDateInStayRange(nextStart, nextEnd, blockedDateKeys)) {
      alert("Selected stay includes unavailable dates.");
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
              navigation={{ side: "left", onClick: prev }}
            />
            <MonthGrid
              viewMonth={rightMonth}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPick={handlePick}
              blockedDateKeys={blockedDateKeys}
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
  checkInDate: PropTypes.string,
  checkOutDate: PropTypes.string,
  onRangeChange: PropTypes.func.isRequired,
};

