import React from "react";
import "./channelmanager.css";

export default function SideDashboard() {
  const items = [
    { label: "Dashboard", icon: "📊" },
    { label: "Calendar", icon: "📅" },
    { label: "Reservations", icon: "📌" },
    { label: "Messages", icon: "💬" },
    { label: "Revenues", icon: "📈" },
    { label: "Finance", icon: "💵" },
    { label: "Reviews", icon: "⭐" },
    { label: "Housekeeping", icon: "🏠" },
    { label: "IoT Hub", icon: "☁️" },
    { label: "Pricing", icon: "💲" },
    { label: "Distribution", icon: "🛠️" },
    { label: "Reporting", icon: "📑" },
    { label: "Compliance", icon: "✅" },
    { label: "Intelligence", icon: "🧠" },
    { label: "Properties", icon: "🌐" },
    { label: "Settings", icon: "⚙️" },
    { label: "Setup", icon: "✏️" },
    { label: "Promo codes", icon: "🎟️" }
  ];

  return (
    <aside className="channel-sidebar">
      <div className="channel-sidebar-title">Dashboard</div>
      <nav className="channel-sidebar-nav">
        {items.map((item) => (
          <a key={item.label} className="channel-sidebar-link" href="#">
            <span className="channel-sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}