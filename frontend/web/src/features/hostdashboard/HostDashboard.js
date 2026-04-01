import React from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaChartPie } from "react-icons/fa";
import { ImStatsBars2 } from "react-icons/im";

import styles from "./HostDashboard.module.scss";

import StatsCard from "./components/StatsCard";
import ReservationsTable from "./components/ReservationsTable";
import TodayPanel from "./components/TodayPanel";
import ArrivalsDepartures from "./components/ArrivalsDepartures";
import MessagesPanel from "./components/MessagesPanel";
import useHostDashboardData from "./hooks/useHostDashboardData";

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
    hostName,
    stats,
    reservations,
    today,
    arrivals,
    departures,
    messages,
    loading,
    error,
  } = useHostDashboardData();

  const statsItems = [
    {
      icon: <FaHome />,
      value: stats.listings,
      label: "Listings",
    },
    {
      icon: <FaCalendarAlt />,
      value: stats.reservations,
      label: "Reservations",
    },
    {
      icon: <ImStatsBars2 />,
      value: formatCurrency(stats.revenue),
      label: "Revenue this month",
    },
    {
      icon: <FaChartPie />,
      value: `${stats.occupancy}%`,
      label: "Occupancy rate",
    },
  ];

  return (
    <main className={styles.dashboardContainer}>
      <div className={styles.dashboardLeft}>
        <h1>Welcome back, {hostName}!</h1>
        <p>Here is what is happening across your properties today</p>
        {error ? <div className={styles.inlineAlert}>{error}</div> : null}

        <div className={styles.statsRow}>
          {statsItems.map((item) => (
            <StatsCard
              key={item.label}
              icon={item.icon}
              value={item.value}
              label={item.label}
              isLoading={loading.stats}
            />
          ))}
        </div>

        <div className={styles.mainGrid}>
          <ReservationsTable data={reservations} isLoading={loading.reservations} />
          <TodayPanel data={today} loadingByItem={loading.today} />
        </div>

        <div className={styles.mainGrid}>
          <ArrivalsDepartures
            arrivals={arrivals}
            departures={departures}
            isLoading={loading.arrivals}
          />
          <MessagesPanel
            messages={messages}
            isLoading={loading.messages}
            onSeeAll={() => navigate("/hostdashboard/messages")}
          />
        </div>
      </div>
    </main>
  );
}

export default HostDashboard;