import React, { useMemo, useState, useEffect } from "react";
import "../styles/RangeCalendar.scss";
import { calendarService } from "../../../hostdashboard/hostcalen/services/calendarService";

const pad = (n) => (n < 10 ? `0${n}` : String(n));
const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const makeDate = (y, m, d) => new Date(y, m, d);
const addMonths = (date, offset) => makeDate(date.getFullYear(), date.getMonth() + offset, 1);
const startOfCalendar = (y, m) => {
  const first = makeDate(y, m, 1);
  // Monday=0 … Sunday=6
  const day = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - day);
  return gridStart;
};
const weekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const monthLabel = (d) =>
  d.toLocaleString(undefined, { month: "long", year: "numeric" });

function MonthGrid({ viewMonth, rangeStart, rangeEnd, onPick, dynamicPrices = {} }) {
  const y = viewMonth.getFullYear();
  const m = viewMonth.getMonth();

  const cells = useMemo(() => {
    const start = startOfCalendar(y, m);
    const arr = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const inMonth = d.getMonth() === m;
      const key = toKey(d);
      const inRange =
        rangeStart && rangeEnd && d >= rangeStart && d <= rangeEnd && inMonth;
      const isStart = rangeStart && key === toKey(rangeStart);
      const isEnd = rangeEnd && key === toKey(rangeEnd);
      const price = dynamicPrices[key];
      arr.push({ d, key, inMonth, inRange, isStart, isEnd, price });
    }
    return arr;
  }, [y, m, rangeStart, rangeEnd, dynamicPrices]);

  return (
    <div className="rc-month">
      <div className="rc-month__label">{monthLabel(viewMonth)}</div>
      <div className="rc-grid rc-grid--head">
        {weekdayLabels.map((w) => (
          <div key={w} className="rc-cell rc-cell--head">
            {w}
          </div>
        ))}
      </div>
      <div className="rc-grid rc-grid--body">
        {cells.map((c) => (
          <button
            key={c.key}
            type="button"
            className={[
              "rc-cell rc-cell--day",
              !c.inMonth && "is-out",
              c.inRange && "is-inrange",
              c.isStart && "is-start",
              c.isEnd && "is-end",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label={c.d.toDateString()}
            onClick={() => onPick(c.d)}
          >
            <span className="rc-day-number">{c.d.getDate()}</span>
            {c.price && c.inMonth && (
              <span className="rc-day-price">€{c.price}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RangeCalendar({ onChange, propertyId }) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const initialMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Set initial dates to today and tomorrow
  const initialStart = new Date(now);
  const initialEnd = new Date(now);
  initialEnd.setDate(now.getDate() + 1);

  const [activeTab, setActiveTab] = useState("calendar");
  const [view, setView] = useState(initialMonth);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [draftStart, setDraftStart] = useState(null);
  const [dynamicPrices, setDynamicPrices] = useState({});

  // Fetch dynamic pricing when propertyId is available
  useEffect(() => {
    const fetchDynamicPricing = async () => {
      if (propertyId) {
        try {
          console.log("📅 RangeCalendar - Fetching dynamic pricing for property:", propertyId);
          const calendarData = await calendarService.loadCalendarData(propertyId);
          console.log("💰 RangeCalendar - Dynamic prices loaded:", calendarData.prices);
          setDynamicPrices(calendarData.prices || {});
        } catch (error) {
          console.error("❌ RangeCalendar - Error fetching dynamic pricing:", error);
          setDynamicPrices({});
        }
      }
    };

    fetchDynamicPricing();
  }, [propertyId]);

  // Call onChange when dates are set initially
  useEffect(() => {
    if (start && end && onChange) {
      onChange({ start, end });
    }
  }, []);
  const next = () => setView((v) => addMonths(v, 1));
  const prev = () => setView((v) => addMonths(v, -1));
  const rightMonth = useMemo(() => addMonths(view, 1), [view]);
  const handlePick = (d) => {
    if (!draftStart) {
      setDraftStart(d);
      setStart(d);
      setEnd(null);
      return;
    }
    const a = draftStart <= d ? draftStart : d;
    const b = draftStart <= d ? d : draftStart;
    setStart(a);
    setEnd(b);
    setDraftStart(null);
    onChange && onChange({ start: a, end: b });
  };
  return (
    <>
      <p className="title">Booking Availability Calendar</p>
      <div className="rc-con">
        <div className="rc">
          <div className="rc-header">
            <div className="rc-tabs" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === "calendar"}
                className={"rc-tab" + (activeTab === "calendar" ? " is-active" : "")}
                onClick={() => setActiveTab("calendar")}
              >
                Calendar
              </button>
            </div>
            <div className="rc-nav">
              <button
                className="rc-nav__btn"
                aria-label="Previous month"
                onClick={prev}
              >
                <span className="rc-chevron rc-chevron--left" />
              </button>
              <button
                className="rc-nav__btn"
                aria-label="Next month"
                onClick={next}
              >
                <span className="rc-chevron rc-chevron--right" />
              </button>
            </div>
          </div>
          {activeTab === "calendar" ? (
            <div className="rc-panels">
              <MonthGrid
                viewMonth={view}
                rangeStart={start}
                rangeEnd={end}
                onPick={handlePick}
                dynamicPrices={dynamicPrices}
              />
              <MonthGrid
                viewMonth={rightMonth}
                rangeStart={start}
                rangeEnd={end}
                onPick={handlePick}
                dynamicPrices={dynamicPrices}
              />
            </div>
          ) : (
            <div className="rc-flexible">
              <p>Select a time window and we'll suggest dates.</p>
            </div>
          )}
          <div className="rc-footer">
            <div className="rc-range">
              <span>Start:</span>
              <strong>{start ? start.toLocaleDateString() : "—"}</strong>
              <span className="rc-range__sep">•</span>
              <span>End:</span>
              <strong>{end ? end.toLocaleDateString() : "—"}</strong>
            </div>
            <button className="rc-cta" type="button">
              Apply
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
