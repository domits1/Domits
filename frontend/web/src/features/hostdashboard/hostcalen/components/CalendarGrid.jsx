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
  bookingsByDate,
  onSelectionChange,
}) {
  // Local selection state - purely for visual feedback
  const [selectedDates, setSelectedDates] = useState(new Set());

  const handleClick = (key, state) => {
    // Don't allow clicking booked dates
    if (state === 'booked') {
      return;
    }

    // Toggle local selection state ONLY for visual feedback
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      // Notify parent of selection change
      if (onSelectionChange) {
        onSelectionChange(next);
      }

      return next;
    });
  };

  if (view !== "month") {
    return (
      <div className="hc-calendar hc-calendar--placeholder">
        {view === "week" ? "Week view (placeholder)" : "Day view (placeholder)"}
      </div>
    );
  }

  return (
    <div className="hc-calendar">
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
              const isSelected = selectedDates.has(key);

              const state =
                selections.booked.has(key) ? "booked" :
                selections.blocked.has(key) ? "blocked" :
                selections.maintenance.has(key) ? "maintenance" :
                "available";

              return (
                <div
                  key={key}
                  className={cx(
                    "hc-cell",
                    !inMonth && "muted",
                    state,
                    isSelected && "selected"
                  )}
                  onClick={() => handleClick(key, state)}
                >
                  <div className="hc-cell-top">
                    <span className="hc-date">{date.getUTCDate()}</span>
                    {prices[key] != null && (
                      <span className="hc-price">€{prices[key]}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}