import React from "react";
import "./channelmanager.scss";

export default function SideDashboard() {
  const items = [
    { label: "Dashboard",    icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/home-outline.svg" },
    { label: "Calendar",     icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/calendar-outline.svg" },
    { label: "Reservations", icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/pin-outline.svg" },
    { label: "Messages",     icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/chatbubble-outline.svg" },
    { label: "Revenues",     icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/stats-chart-outline.svg" },
    { label: "Finance",      icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/cash-outline.svg" },
    { label: "Reviews",      icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/star-outline.svg" },
    { label: "Housekeeping", icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/sparkles-outline.svg" },
    { label: "IoT Hub",      icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/cloud-outline.svg" },
    { label: "Pricing",      icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/pricetag-outline.svg" },
    { label: "Distribution", icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/share-social-outline.svg" },
    { label: "Reporting",    icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/document-text-outline.svg" },
    { label: "Compliance",   icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/shield-checkmark-outline.svg" },
    { label: "Intelligence", icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/bulb-outline.svg" },
    { label: "Properties",   icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/business-outline.svg" },
    { label: "Settings",     icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/settings-outline.svg" },
    { label: "Setup",        icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/construct-outline.svg" },
    { label: "Promo codes",  icon: "https://cdn.jsdelivr.net/npm/ionicons@7.1.0/dist/svg/pricetags-outline.svg" }
  ];

  return (
    <aside className="channel-sidebar">
      <div className="channel-sidebar-title">Dashboard</div>
      <nav className="channel-sidebar-nav">
        {items.map(item => (
          <a key={item.label} className="channel-sidebar-link" href="#">
            <img src={item.icon} alt="" className="channel-sidebar-icon" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}