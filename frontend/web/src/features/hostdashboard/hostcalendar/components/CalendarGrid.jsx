import React, { useRef, useState } from "react";
import { toKey, isSameMonthUTC, dayNames, monthNames } from "../utils/date";
import { cx } from "../utils/classNames";

export default function CalendarGrid({
  view,
  cursor,
  monthGrid,
  selections,
  prices,
  bookingsByDate = {},
  onToggle,
  onDragSelect,
}) {
  const dragging = useRef(false);
  const [range, setRange] = useState(new Set());
  const [hoveredDate, setHoveredDate] = useState(null);

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

              const bookingInfo = bookingsByDate[key];
              const hasBooking = bookingInfo && bookingInfo.length > 0;

              return (
                <div
                  key={key}
                  className={cx("hc-cell", !inMonth && "muted", state, isDrag && "dragging", hasBooking && "has-booking")}
                  onMouseDown={() => handleMouseDown(key)}
                  onMouseEnter={() => {
                    handleEnter(key);
                    if (hasBooking) setHoveredDate(key);
                  }}
                  onMouseLeave={() => {
                    if (hasBooking) setHoveredDate(null);
                  }}
                  onClick={() => onToggle(state === "available" ? "blocked" : "available", key)}
                >
                  <div className="hc-cell-top">
                    <span className="hc-date">{date.getUTCDate()}</span>
                    {prices[key] != null && (
                      <span className="hc-price">€{prices[key]}</span>
                    )}
                  </div>
                  {hasBooking && (
                    <div className="hc-booking-info">
                      <span className="hc-guest-name">{bookingInfo[0].guestName}</span>
                      {bookingInfo[0].guests && (
                        <span className="hc-guest-count">👤 {bookingInfo[0].guests}</span>
                      )}
                    </div>
                  )}
                  {hoveredDate === key && hasBooking && (
                    <div className="hc-booking-tooltip">
                      <div className="tooltip-header">
                        <strong>Booking Details</strong>
                      </div>
                      {bookingInfo.map((booking, idx) => (
                        <div key={idx} className="tooltip-booking">
                          <div><strong>Guest:</strong> {booking.guestName}</div>
                          {booking.guestEmail && <div><strong>Email:</strong> {booking.guestEmail}</div>}
                          <div><strong>Check-in:</strong> {booking.checkIn}</div>
                          <div><strong>Check-out:</strong> {booking.checkOut}</div>
                          <div><strong>Guests:</strong> {booking.guests}</div>
                          <div><strong>Nights:</strong> {booking.nights}</div>
                          {booking.totalPrice > 0 && <div><strong>Total:</strong> €{booking.totalPrice}</div>}
                          <div><strong>Status:</strong> <span className={`status-${booking.status}`}>{booking.status}</span></div>
                          {booking.id && <div className="booking-id">ID: {booking.id}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}