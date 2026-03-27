import React from "react";
import styles from "./HostDashboard.module.scss";
import { useNavigate } from "react-router-dom";

import StatsCard from "./components/StatsCard";
import ReservationsTable from "./components/ReservationsTable";
import TodayPanel from "./components/TodayPanel";
import ArrivalsDepartures from "./components/ArrivalsDepartures";
import MessagesPanel from "./components/MessagesPanel";

import mockData from "./components/MockData";

function HostDashboard() {
  const navigate = useNavigate();

  const {
    host,
    stats,
    reservations,
    today,
    arrivals,
    departures,
    messages,
  } = mockData;

  return (
    <main className={styles.dashboardContainer}>
      <div className={styles.dashboardLeft}>
        
        <h2>Welcome back, {host.name}!</h2>
        <p>Here is what is happening across your properties today</p>

        <div className={styles.statsRow}>
          <StatsCard icon="🏠" value={stats.listings} label="Listings" />
          <StatsCard icon="📅" value={stats.reservations} label="Reservations" />
          <StatsCard icon="💰" value={`€${stats.revenue}`} label="Revenue this month" />
          <StatsCard icon="✅" value={`${stats.occupancy}%`} label="Occupancy rate" />
        </div>

        <div className={styles.mainGrid}>
          <ReservationsTable data={reservations} />
          <TodayPanel data={today} />
        </div>

        <div className={styles.mainGrid}>
          <ArrivalsDepartures arrivals={arrivals} departures={departures} />
          <MessagesPanel
            messages={messages}
            onSeeAll={() => navigate("/hostdashboard/messages")}
          />
        </div>

      </div>
    </main>
  );
}

export default HostDashboard;