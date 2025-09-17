import React from "react";
import { formatYearMonth } from "../utils/date";

export default function Toolbar({ view, setView, cursor, onPrev, onNext, onToday }) {
  return (
    <div className="hc-toolbar">
      <div className="hc-toolbar-left">
        <button className="hc-icon-btn" onClick={onPrev} aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" stroke="currentColor" fill="none" strokeWidth="2"/></svg>
        </button>
        <div className="hc-toolbar-right">
          <select
            className="hc-select"
            value={view}
            onChange={(e) => setView(e.target.value)}
          >
            <option value="month">Month</option>
          </select>
          <div className="hc-toolbar-center">
            <div className="hc-month-pill">{formatYearMonth(cursor)}</div>
          </div>
        
        </div>
        <button className="hc-icon-btn" onClick={onNext} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" strokeWidth="2"/></svg>
        </button>
      </div>

      

     
    </div>
  );
}