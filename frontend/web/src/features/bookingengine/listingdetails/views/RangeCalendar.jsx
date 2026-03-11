import PropTypes from "prop-types";
import React, { useMemo, useState } from "react";
import { FaCalendarAlt } from "react-icons/fa";
import "../styles/RangeCalendar.scss";

const pad = (n) => (n < 10 ? `0${n}` : String(n));
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
const formatRangeDate = (date) => {
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

function MonthGrid({ viewMonth, rangeStart, rangeEnd, onPick, navigation }) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  const cells = useMemo(() => {
    const start = startOfCalendar(year, month);
    const items = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const inMonth = date.getMonth() === month;
      const key = toKey(date);
      const inRange = rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd && inMonth;
      const isStart = rangeStart && key === toKey(rangeStart);
      const isEnd = rangeEnd && key === toKey(rangeEnd);
      items.push({ date, key, inMonth, inRange, isStart, isEnd });
    }

    return items;
  }, [month, rangeEnd, rangeStart, year]);

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
              cell.inRange && "is-inrange",
              cell.isStart && "is-start",
              cell.isEnd && "is-end",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={cell.date.toDateString()}
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
  navigation: PropTypes.shape({
    side: PropTypes.oneOf(["left", "right"]),
    onClick: PropTypes.func,
  }),
};

MonthGrid.defaultProps = {
  rangeStart: null,
  rangeEnd: null,
  navigation: null,
};

export default function RangeCalendar({ onChange }) {
  const now = new Date();
  const initialMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const initialStart = new Date(now);
  const initialEnd = new Date(now);

  initialStart.setDate(now.getDate() - 2);
  initialEnd.setDate(now.getDate() + 2);

  const [view, setView] = useState(initialMonth);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [draftStart, setDraftStart] = useState(null);

  const rightMonth = useMemo(() => addMonths(view, 1), [view]);

  const next = () => setView((value) => addMonths(value, 1));
  const prev = () => setView((value) => addMonths(value, -1));

  const handlePick = (date) => {
    if (!draftStart) {
      setDraftStart(date);
      setStart(date);
      setEnd(null);
      return;
    }

    const startTimestamp = Math.min(draftStart.getTime(), date.getTime());
    const endTimestamp = Math.max(draftStart.getTime(), date.getTime());
    const nextStart = new Date(startTimestamp);
    const nextEnd = new Date(endTimestamp);

    setStart(nextStart);
    setEnd(nextEnd);
    setDraftStart(null);

    if (onChange) {
      onChange({ start: nextStart, end: nextEnd });
    }
  };

  const rangeLabel = start && end ? `${formatRangeDate(start)} - ${formatRangeDate(end)}` : "Select your stay dates";

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
              rangeStart={start}
              rangeEnd={end}
              onPick={handlePick}
              navigation={{ side: "left", onClick: prev }}
            />
            <MonthGrid
              viewMonth={rightMonth}
              rangeStart={start}
              rangeEnd={end}
              onPick={handlePick}
              navigation={{ side: "right", onClick: next }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

RangeCalendar.propTypes = {
  onChange: PropTypes.func,
};

RangeCalendar.defaultProps = {
  onChange: null,
};
