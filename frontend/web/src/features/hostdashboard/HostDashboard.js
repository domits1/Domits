import React, { useState, useEffect } from "react";
import "./HostHomepage.scss";
import styles from "./HostDashboard.module.scss";
import StripeModal from "./StripeModal.js";

import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";

import StatsCard from "./components/StatsCard";
import ReservationsTable from "./components/ReservationsTable";
import TodayPanel from "./components/TodayPanel";
import ArrivalsDepartures from "./components/ArrivalsDepartures";
import MessagesPanel from "./components/MessagesPanel";

import { getAccessToken } from "../../services/getAccessToken.js";

function HostDashboard() {
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dashboardData, setDashboardData] = useState({
    listings: 0,
    reservations: 0,
    revenue: 0,
    occupancy: 0,
  });

  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState({
    email: "",
    name: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
        setUser({
          email: userInfo.attributes.email,
          name: userInfo.attributes.given_name,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const checkStripe = async () => {
      try {
        const userInfo = await Auth.currentAuthenticatedUser();
        const response = await fetch(
          "https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists",
          {
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify({ sub: userInfo.attributes.sub }),
          }
        );
        const { hasStripeAccount } = await response.json();
        const parsed = JSON.parse(hasStripeAccount.body);
        setIsStripeModalOpen(!parsed);
      } catch (err) {
        console.error(err);
      }
    };
    checkStripe();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
        {
          method: "GET",
          headers: {
            Authorization: getAccessToken(),
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      setAccommodations(data || []);

      setDashboardData({
        listings: data?.length || 0,
        reservations: data?.length || 0,
        revenue: data?.revenue || 0,
        occupancy: data?.occupancy || 0,
      });
    } catch (error) {
      console.error(error);
      setAccommodations([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className="host-pc-dashboard">
          <StripeModal
            isOpen={isStripeModalOpen}
            onClose={() => setIsStripeModalOpen(false)}
          />

          <div className={styles.dashboardContainer}>
            <div className={styles.dashboardLeft}>
              <h2>Welcome back, {user.name || "Host"}!</h2>
              <p>Here is what is happening across your properties today</p>

              <div className={styles.statsRow}>
                <StatsCard icon="🏠" value={dashboardData.listings} label="Listings" />
                <StatsCard icon="📅" value={dashboardData.reservations} label="Reservations" />
                <StatsCard icon="💰" value={`€${dashboardData.revenue}`} label="Revenue this month" />
                <StatsCard icon="✅" value={`${dashboardData.occupancy}%`} label="Occupancy rate" />
              </div>

              <div className={styles.mainGrid}>
                <ReservationsTable data={accommodations} isLoading={isLoading} />
                <TodayPanel data={dashboardData} />
              </div>

              <div className={styles.mainGrid}>
                <ArrivalsDepartures data={accommodations} />
                <MessagesPanel />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HostDashboard;