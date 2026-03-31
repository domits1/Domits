import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HostDashboard.module.scss";
import { FaBed, FaCalendarAlt, FaBox, FaComments } from "react-icons/fa";
import StatsCard from "./components/StatsCard";
import ReservationsTable from "./components/ReservationsTable";
import TodayPanel from "./components/TodayPanel";
import ArrivalsDepartures from "./components/ArrivalsDepartures";
import MessagesPanel from "./components/MessagesPanel";

import mockData from "./components/MockData";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

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

  const statsItems = [
    {
      icon: <FaBed />,
      value: stats.listings,
      label: "Listings",
    },
    {
      icon: <FaCalendarAlt />,
      value: stats.reservations,
      label: "Reservations",
    },
    {
      icon: <FaBox />,
      value: formatCurrency(stats.revenue),
      label: "Revenue this month",
    },
    {
      icon: <FaComments />,
      value: `${stats.occupancy}%`,
      label: "Occupancy rate",
    },
  ];

  return (
    <main className={styles.dashboardContainer}>
      <div className={styles.dashboardLeft}>
        <h1>Welcome back, {host.name}!</h1>
        <p>Here is what is happening across your properties today</p>

        <div className={styles.statsRow}>
          {statsItems.map((item) => (
            <StatsCard
              key={item.label}
              icon={item.icon}
              value={item.value}
              label={item.label}
            />
          ))}
        </div>

        <div className={styles.mainGrid}>
          <ReservationsTable data={reservations} isLoading={false} />
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