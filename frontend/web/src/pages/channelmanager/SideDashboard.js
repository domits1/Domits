import React from "react";
import "./channelmanager.css";

export default function SideDashboard() {
  const items = [
    "Dashboard",
    "Calendar",
    "Reservations",
    "Messages",
    "Revenues",
    "Finance",
    "Reviews",
    "Housekeeping",
    "IoT Hub",
    "Pricing",
    "Distribution",
    "Reporting",
    "Compliance",
    "Intelligence",
    "Properties",
    "Settings",
    "Setup",
    "Promo codes"
  ];

  return (
    <aside className="channel-sidebar">
      <div className="channel-sidebar-title">Dashboard</div>
      <nav className="channel-sidebar-nav">
        {items.map(i => (
          <a key={i} className="channel-sidebar-link" href="#">{i}</a>
        ))}
      </nav>
    </aside>
  );
}