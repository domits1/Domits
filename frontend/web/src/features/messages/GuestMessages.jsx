import React from "react";
import Navbar from "../../components/base/navbar";
import Pages from "../guestdashboard/Pages";
import Messages from "../../components/messages/Messages";

/**
 * Guest messages page
 * - Uses the unified Messages V2 UI (same as host, but dashboardType="guest")
 * - Keeps guest sidebar navigation (Pages) + Navbar
 * - Removes legacy hostMessages.scss dependency
 */
const GuestMessages = () => {
  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Guest sidebar */}
        <div style={{ width: "15rem", flexShrink: 0 }}>
          <Pages onNavigate={() => {}} />
        </div>

        {/* Messages V2 content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Messages dashboardType="guest" />
        </div>
      </div>

      <Navbar isLoggedIn />
    </>
  );
};

export default GuestMessages;
