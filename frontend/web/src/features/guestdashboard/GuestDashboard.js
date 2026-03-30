import React from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { FaBed, FaCalendarAlt, FaBox, FaComments } from "react-icons/fa";

import StatsCard from "../hostdashboard/components/StatsCard";
import MessagesPanel from "../hostdashboard/components/MessagesPanel";

import CurrentStayCard from "./components/CurrentStayCard";
import UpcomingStayCard from "./components/UpcomingStayCard";
import EmptyState from "./components/EmptyState";
import PastTrips from "./components/PastTrips";
import TripReminders from "./components/TripReminders";

import mockData from "./utils/mockData";

function GuestDashboard() {
  const navigate = useNavigate();

  const {
    user,
    stats,
    currentStay,
    upcomingStays,
    pastStays,
    messages,
  } = mockData;

  const hasCurrentStay = !!currentStay;
  const hasUpcomingStay = upcomingStays.length > 0;

  return (
    <main className="dashboardContainer">
      <div className="dashboardLeft">

        <h1>Welcome back, {user.name}!</h1>
        <p>Here is an overview of your trips and upcoming trips</p>

        <div className="statsRow">
          <StatsCard icon={<FaBed />} value={stats.current} label="Current stay" />
          <StatsCard icon={<FaCalendarAlt />} value={stats.upcoming} label="Upcoming stays" />
          <StatsCard icon={<FaBox />} value={stats.past} label="Past stays" />
          <StatsCard icon={<FaComments />} value={stats.messages} label="Unread messages" />
        </div>

        <div className="mainGrid">

          <div>

            {hasCurrentStay && (
  <CurrentStayCard stay={currentStay} />
)}

{hasUpcomingStay && (
  <UpcomingStayCard stay={upcomingStays[0]} />
)}

{!hasCurrentStay && !hasUpcomingStay && (
  <EmptyState />
)}

            <PastTrips stays={pastStays} />

          </div>

          <div>

            <TripReminders reminders={mockData.reminders} />

            <MessagesPanel
              messages={messages}
              onSeeAll={() => navigate("/guestdashboard/messages")}
            />

          </div>

        </div>

      </div>
    </main>
  );
}

export default GuestDashboard;