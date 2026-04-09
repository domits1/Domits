import React from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { FaBed, FaCalendarAlt, FaBox, FaComments } from "react-icons/fa";
import PulseBarsLoader from "../../components/loaders/PulseBarsLoader";

import StatsCard from "../hostdashboard/components/StatsCard";
import MessagesPanel from "../hostdashboard/components/MessagesPanel";

import CurrentStayCard from "./components/CurrentStayCard";
import UpcomingStayCard from "./components/UpcomingStayCard";
import EmptyState from "./components/EmptyState";
import PastTrips from "./components/PastTrips";
import TripReminders from "./components/TripReminders";
import useGuestDashboardData from "./hooks/useGuestDashboardData";

const renderLoaderCard = (title, message) => (
  <div className="card">
    <h2>{title}</h2>
    <PulseBarsLoader message={message} />
  </div>
);

function GuestDashboard() {
  const navigate = useNavigate();
  const {
    guestName,
    stats,
    currentStay,
    upcomingStay,
    pastStays,
    reminders,
    messages,
    loading,
    error,
  } = useGuestDashboardData();

  const hasCurrentStay = !!currentStay;
  const hasUpcomingStay = !!upcomingStay;

  return (
    <main className="dashboardContainer">
      <div className="dashboardLeft">
        <h1>Welcome back, {guestName}!</h1>
        <p>Here is an overview of your trips and upcoming trips</p>

        <div className="statsRow">
          <StatsCard icon={<FaBed />} value={stats.current} label="Current stays" isLoading={loading.stats} />
          <StatsCard icon={<FaCalendarAlt />} value={stats.upcoming} label="Upcoming stays" isLoading={loading.stats} />
          <StatsCard icon={<FaBox />} value={stats.past} label="Past stays" isLoading={loading.stats} />
          <StatsCard icon={<FaComments />} value={stats.messages} label="Messages" isLoading={loading.messages} />
        </div>

        {error ? (
          <div className="card" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        <div className="mainGrid">
          <div>
            {loading.stays ? (
              <>
                {renderLoaderCard("Your trip overview", "Loading trips...")}
                {renderLoaderCard("Past trips", "Loading trip history...")}
              </>
            ) : (
              <>
                {hasCurrentStay ? <CurrentStayCard stay={currentStay} /> : null}
                {hasUpcomingStay ? <UpcomingStayCard stay={upcomingStay} /> : null}
                {!hasCurrentStay && !hasUpcomingStay ? <EmptyState /> : null}
                <PastTrips stays={pastStays} />
              </>
            )}
          </div>

          <div>
            {loading.stays ? renderLoaderCard("Trip reminders", "Loading reminders...") : <TripReminders reminders={reminders} />}

            <MessagesPanel
              messages={messages}
              isLoading={loading.messages}
              onSeeAll={() => navigate("/guestdashboard/messages")}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

export default GuestDashboard;