import React, { useState } from "react";
import SideDashboard from "./SideDashboard";
import ChannelManagerCard from "./ChannelManagerCard";
import "./channelmanager.css";

export default function ChannelManager() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Accommodations");
  const [regionOpen, setRegionOpen] = useState(false);
  const [region, setRegion] = useState("All");

  const items = [
    { id: "1", name: "Testen kaart", subtitle: "Test kanaal", logoText: "Test", status: "disconnected" },
    { id: "2", name: "Test kaart 2", subtitle: "Test 2", logoText: "Test", status: "disconnected" },
    { id: "3", name: "Test 3", subtitle: "Test beschrijving", logoText: "Test", status: "disconnected" }
  ];

  const shown = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="channel-layout">
      <SideDashboard />
      <main className="channel-main">
        <div className="channel-header">
          <h1 className="channel-title">Marketplace for integrations</h1>

          <div className="channel-tabs">
            {["Accommodations", "Boats", "Camping", "Car Rentals"].map(tab => (
              <button
                key={tab}
                className={`channel-tab ${activeTab === tab ? "channel-tab-active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="channel-actions">
            <div className={`channel-region ${regionOpen ? "channel-region-open" : ""}`}>
              <button
                className="channel-region-trigger"
                onClick={() => setRegionOpen(!regionOpen)}
              >
                {region}
              </button>
              <div className="channel-region-menu">
                {["All", "Europe", "Netherlands"].map(opt => (
                  <div
                    key={opt}
                    className="channel-region-item"
                    aria-selected={region === opt}
                    onClick={() => {
                      setRegion(opt);
                      setRegionOpen(false);
                    }}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            </div>

            <div className="channel-search">
              <input
                className="channel-search-input"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="channel-search-icon">🔍</span>
            </div>
          </div>
        </div>

        <section className="channel-grid">
          {shown.map(item => (
            <ChannelManagerCard
              key={item.id}
              name={item.name}
              subtitle={item.subtitle}
              logoText={item.logoText}
              status={item.status}
            />
          ))}
        </section>
      </main>
    </div>
  );
}