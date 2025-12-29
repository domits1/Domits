import React from "react";
export default function Legend() {
  const items = [
    { color: "#4e7cff", label: "Booked" },
    { color: "#22c55e", label: "Available" },
    { color: "#ef4444", label: "Blocked" },
    { color: "#f59e0b", label: "Maintenance" },
    { color: "#06b6d4", label: "Seasonal price" },
  ];
  return (
    <div className="hc-legend">
      {items.map((i) => (
        <div className="hc-legend-item" key={i.label}>
          <span className="hc-dot" style={{ background: i.color }} />
          <span>{i.label}</span>
        </div>
      ))}
    </div>
  );
}