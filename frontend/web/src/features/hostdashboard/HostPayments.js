import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import { HostRevenueService } from "../hostdashboard/services/HostRevenueService.js";
import ClipLoader from "react-spinners/ClipLoader";

import RevenueOverview from "./HostRevenueCards/RevenueOverview.jsx";
import OccupancyRateCard from "./HostRevenueCards/OccupancyRate.jsx";
import RevPARCard from "./HostRevenueCards/RevPAR.jsx";
import ADRCard from "./HostRevenueCards/ADRCard.jsx";
import BookedNights from "./HostRevenueCards/BookedNights.jsx";
import ALOSCard from "./HostRevenueCards/ALOSCard.jsx";
import MonthlyComparison from "./HostRevenueCards/MonthlyComparison.jsx";

import "./HostRevenueStyle.scss";

const POLL_MS = 2000;

const HostRevenues = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);

  const [bookedNights, setBookedNights] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);

  // ✅ cache last values so we only setState when changed
  const lastRef = useRef({
    revenue: null,
    nights: null,
    available: null,
    properties: null,
  });

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        if (!isMountedRef.current) return;
        setCognitoUserId(user.attributes.sub);
      } catch (err) {
        if (isMountedRef.current) {
          setError("Authentication failed");
          setLoading(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ---------- FETCH ALL ----------
  const fetchAllData = useCallback(
    async (silent = false) => {
      if (!cognitoUserId) return;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        await Auth.currentSession();

        const [revenue, nights, available, properties] = await Promise.all([
          HostRevenueService.getRevenue(cognitoUserId),
          HostRevenueService.getBookedNights(cognitoUserId),
          HostRevenueService.getAvailableNights(cognitoUserId),
          HostRevenueService.getPropertyCount(cognitoUserId),
        ]);

        if (!isMountedRef.current) return;

        const nextRevenue = revenue ?? 0;
        const nextNights = nights ?? 0;
        const nextAvailable = available ?? 0;
        const nextProperties = properties ?? 0;

        // ✅ only update state when the value actually changed
        if (lastRef.current.revenue !== nextRevenue) {
          setTotalRevenue(nextRevenue);
          lastRef.current.revenue = nextRevenue;
        }

        if (lastRef.current.nights !== nextNights) {
          setBookedNights(nextNights);
          lastRef.current.nights = nextNights;
        }

        if (lastRef.current.available !== nextAvailable) {
          setAvailableNights(nextAvailable);
          lastRef.current.available = nextAvailable;
        }

        if (lastRef.current.properties !== nextProperties) {
          setPropertyCount(nextProperties);
          lastRef.current.properties = nextProperties;
        }
      } catch (err) {
        if (isMountedRef.current && !silent) {
          setError("Failed to fetch revenue data");
        }
      } finally {
        if (isMountedRef.current && !silent) {
          setLoading(false);
        }
      }
    },
    [cognitoUserId]
  );

  // First load
  useEffect(() => {
    if (!cognitoUserId) return;
    fetchAllData(false);
  }, [cognitoUserId, fetchAllData]);

  // Focus & visibility refresh (silent)
  useEffect(() => {
    const onFocus = () => fetchAllData(true);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchAllData(true);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchAllData]);

  // Interval refresh (silent) — still polls, but UI updates only on change
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) fetchAllData(true);
    }, POLL_MS);

    return () => clearInterval(id);
  }, [fetchAllData]);

  const occupancyRate =
    availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;

  // ---------- RENDER ----------
  if (loading) {
    return (
      <div className="hr-revenue-spinner-container">
        <ClipLoader size={100} color="#3498db" />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: "red" }}>{error}</div>;
  }

  return (
    <main className="hr-page-body hr-container">
      <h2>Yearly Report</h2>

      <section className="hr-host-revenues">
        <div className="hr-content">
          {/* Overview Cards */}
          <div className="hr-revenue-overview">
            <RevenueOverview
              title="Total Revenue"
              value={`€${Number(totalRevenue).toLocaleString()}`}
            />
            <RevenueOverview
              title="Booked Nights"
              value={Number(bookedNights).toLocaleString()}
            />
            <RevenueOverview
              title="Available Nights"
              value={Number(availableNights).toLocaleString()}
            />
            <RevenueOverview
              title="Total Properties"
              value={Number(propertyCount).toLocaleString()}
            />
          </div>

          {/* Detail cards */}
          <div className="hr-cards">
            <OccupancyRateCard
              occupancyRate={occupancyRate.toFixed(2)}
              numberOfProperties={propertyCount}
            />

            <ADRCard />
            <RevPARCard />
            <BookedNights />
            <ALOSCard hostId={cognitoUserId} />
          </div>
        </div>
      </section>
    </main>
  );
};

export default HostRevenues;
