import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import "../../styles/sass/features/guestdashboard/guestDashboard.scss";
import { FaBed, FaCalendarAlt, FaBox, FaComments } from "react-icons/fa";
import PulseBarsLoader from "../../components/loaders/PulseBarsLoader";
import StatsCard from "../hostdashboard/components/StatsCard";
import MessagesPanel from "../hostdashboard/components/MessagesPanel";
import CurrentStayCard from "./components/CurrentStayCard";
import UpcomingStayCard from "./components/UpcomingStayCard";
import EmptyState from "./components/EmptyState";
import PastTrips from "./components/PastTrips";
import CancelledTrips from "./components/CancelledTrips";
import TripReminders from "./components/TripReminders";
import useGuestDashboardData from "./hooks/useGuestDashboardData";

const contentByLanguage = { en, nl, de, es };

const renderLoaderCard = (title, message) => (
  <div className="card">
    <h2>{title}</h2>
    <PulseBarsLoader message={message} />
  </div>
);

function GuestDashboard() {
  const navigate = useNavigate();
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;
  const {
    guestName,
    stats,
    currentStay,
    upcomingStay,
    pastStays,
    cancelledStays,
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
        <h1>{t?.overview?.welcomeBack || "Welcome back,"} {guestName}!</h1>
        <p>{t?.overview?.tripsOverview || "Here is an overview of your trips and upcoming trips"}</p>

        <div className="statsRow">
          <StatsCard icon={<FaBed />} value={stats.current} label={t?.overview?.currentStays || "Current stays"} isLoading={loading.stats} />
          <StatsCard icon={<FaCalendarAlt />} value={stats.upcoming} label={t?.overview?.upcomingStays || "Upcoming stays"} isLoading={loading.stats} />
          <StatsCard icon={<FaBox />} value={stats.past} label={t?.overview?.pastStays || "Past stays"} isLoading={loading.stats} />
          <StatsCard icon={<FaComments />} value={stats.messages} label={t?.overview?.messages || "Messages"} isLoading={loading.messages} />
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
                {renderLoaderCard(t?.overview?.yourTripOverview || "Your trip overview", t?.overview?.loadingTrips || "Loading trips...")}
                {renderLoaderCard(t?.overview?.pastTrips || "Past trips", t?.overview?.loadingTripHistory || "Loading trip history...")}
              </>
            ) : (
              <>
                {hasCurrentStay ? <CurrentStayCard stay={currentStay} /> : null}
                {hasUpcomingStay ? <UpcomingStayCard stay={upcomingStay} /> : null}
                {cancelledStays && cancelledStays.length > 0 ? <CancelledTrips stays={cancelledStays} /> : null}
                {!hasCurrentStay && !hasUpcomingStay ? <EmptyState /> : null}
                <PastTrips stays={pastStays} />
              </>
            )}
          </div>

          <div>
            {loading.stays ? (
              renderLoaderCard(t?.overview?.tripReminders || "Trip reminders", t?.overview?.loadingReminders || "Loading reminders...")
            ) : (
              <TripReminders reminders={reminders} />
            )}

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
