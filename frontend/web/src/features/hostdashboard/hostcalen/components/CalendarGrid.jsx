import React, { useRef, useState } from "react";
import { toKey, isSameMonthUTC, dayNames, monthNames } from "../utils/date";
import { cx } from "../utils/classNames";

export default function CalendarGrid({
  view,
  cursor,
  monthGrid,
  selections,
  prices,
  onToggle,
  onDragSelect,
}) {
  // basic drag select (desktop)
  const dragging = useRef(false);
  const [range, setRange] = useState(new Set());

  const handleMouseDown = (key) => {
    dragging.current = true;
    setRange(new Set([key]));
  };
  const handleEnter = (key) => {
    if (!dragging.current) return;
    setRange((prev) => new Set(prev).add(key));
  };
  const handleUp = () => {
    if (dragging.current && range.size) onDragSelect([...range]);
    dragging.current = false;
    setRange(new Set());
  };

  if (view !== "month") {
    return (
      <div className="hc-calendar hc-calendar--placeholder">
        {view === "week" ? "Week view (placeholder)" : "Day view (placeholder)"}
      </div>
    );
  }

  return (
    <div className="hc-calendar" onMouseLeave={handleUp} onMouseUp={handleUp}>
      <div className="hc-grid-head">
        {dayNames.map((d) => (
          <div key={d} className="hc-grid-head-cell">{d}</div>
        ))}
      </div>

      <div className="hc-grid-body">
        {monthGrid.map((week, wi) => (
          <div className="hc-grid-row" key={wi}>
            {week.map((date) => {
              const key = toKey(date);
              const inMonth = isSameMonthUTC(date, cursor);
              const isDrag = range.has(key);

              const state =
                selections.booked.has(key) ? "booked" :
                selections.blocked.has(key) ? "blocked" :
                selections.maintenance.has(key) ? "maintenance" :
                "available";

              return (
                <div
                  key={key}
                  className={cx("hc-cell", !inMonth && "muted", state, isDrag && "dragging")}
                  onMouseDown={() => handleMouseDown(key)}
                  onMouseEnter={() => handleEnter(key)}
                  onClick={() => onToggle(state === "available" ? "blocked" : "available", key)}
                >
                  <div className="hc-cell-top">
                    <span className="hc-date">{date.getUTCDate()}</span>
                    {prices[key] != null && (
                      <span className="hc-price">€{prices[key]}</span>
                    )}
                  </div>
                  {/* cell content area */}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}