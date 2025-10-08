import React from "react";

export default function Legend() {
  return (
    <div className="hc-legend">
      <span className="dot booked" /> Booked
      <span className="dot available" /> Available
      <span className="dot blocked" /> Blocked
      <span className="dot maint" /> Maintenance
      <span className="dot seasonal" /> Seasonal price
    </div>
  );
}
