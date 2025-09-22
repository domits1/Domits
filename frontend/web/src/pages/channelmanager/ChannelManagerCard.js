import React from "react";
import "./channelmanager.css";

export default function ChannelManagerCard({ name, subtitle, logoText, status }) {
  return (
    <article className="channel-card">
      <div className="channel-card-row">
        <div className="channel-card-logo">{logoText}</div>
        <button className="channel-card-menu">⋯</button>
      </div>
      <div className="channel-card-content">
        <h3 className="channel-card-name">{name}</h3>
        <p className="channel-card-sub">{subtitle}</p>
      </div>
      <button className={`channel-card-btn ${status === "connected" ? "channel-card-btn-connected" : ""}`}>
        {status === "connected" ? "Connected" : "Connect"}
      </button>
    </article>
  );
}