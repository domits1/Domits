import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import { HostRevenueService } from "../hostdashboard/services/HostRevenueService.js";
import { HostKpiAllService } from "../hostdashboard/services/HostKpiAllService.js";
import ClipLoader from "react-spinners/ClipLoader";
import { FaMoneyBillWave, FaBed, FaRegClock, FaBuilding, FaExclamationTriangle } from "react-icons/fa";

import RevenueOverview from "./HostRevenueCards/RevenueOverview.jsx";
import MonthlyComparison from "./HostRevenueCards/MonthlyComparison.jsx";

import "./HostRevenueStyle.scss";

const POLL_MS = 2000;

const HostRevenues = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);

  const [bookedNights, setBookedNights] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [propertyCount, setPropertyCount] = useState(0);
  const [adr, setAdr] = useState(null);
  const [monthlyKpiAll, setMonthlyKpiAll] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);

  const lastRef = useRef({
    revenue: null,
    nights: null,
    available: null,
    properties: null,
    adr: null,
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

  const fetchAllData = useCallback(
    async (silent = false) => {
      if (!cognitoUserId) return;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        await Auth.currentSession();

        const [revenue, nights, available, properties, kpiAll] = await Promise.all([
          HostRevenueService.getRevenue(cognitoUserId),
          HostRevenueService.getBookedNights(cognitoUserId),
          HostRevenueService.getAvailableNights(cognitoUserId),
          HostRevenueService.getPropertyCount(cognitoUserId),
          HostKpiAllService.fetchAll(cognitoUserId, "monthly"),
        ]);

        if (!isMountedRef.current) return;

        const nextRevenue = revenue ?? 0;
        const nextNights = nights ?? 0;
        const nextAvailable = available ?? 0;
        const nextProperties = properties ?? 0;
        // kpiAll is null when the ADR fetch itself failed (distinct from a
        // legitimate 0 rate) - keep that distinction so Gross Missed Revenue
        // can show "unavailable" instead of implying nothing was missed.
        const nextAdr = kpiAll == null ? null : Number(kpiAll?.averageDailyRate ?? 0);

        // Passed whole to MonthlyComparison so it doesn't need its own
        // redundant metric=all fetch for the same current-month data.
        setMonthlyKpiAll(kpiAll ?? null);

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
        if (lastRef.current.adr !== nextAdr) {
          setAdr(nextAdr);
          lastRef.current.adr = nextAdr;
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

  useEffect(() => {
    if (!cognitoUserId) return;
    fetchAllData(false);
  }, [cognitoUserId, fetchAllData]);

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

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) fetchAllData(true);
    }, POLL_MS);

    return () => clearInterval(id);
  }, [fetchAllData]);

  const occupancyRate = availableNights > 0 ? (bookedNights / availableNights) * 100 : 0;
  const unbookedNights = Math.max(availableNights - bookedNights, 0);
  const grossMissedRevenue = adr == null ? null : adr * unbookedNights;
  const grossMissedRevenueDisplay =
    grossMissedRevenue == null
      ? "–"
      : `€${grossMissedRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const handleDownloadReport = () => {
    const now = new Date();
    // These figures are the current calendar month (HostRevenueService/HostKpiAllService
    // both default to filterType="monthly"), not the calendar year - label accordingly.
    const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });
    const monthSlug = now.toLocaleString("en-US", { month: "long" }).toLowerCase();
    const rows = [
      ["Metric", "Value"],
      ["Month", monthLabel],
      ["Total Revenue (EUR)", totalRevenue],
      ["Booked Nights", bookedNights],
      ["Available Nights", availableNights],
      ["Total Properties", propertyCount],
      ["Occupancy Rate (%)", occupancyRate.toFixed(2)],
      ["Gross Missed Revenue (EUR)", grossMissedRevenue == null ? "N/A" : grossMissedRevenue.toFixed(2)],
    ];

    const csvContent = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `monthly-revenue-report-${monthSlug}-${now.getFullYear()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      <h2>Monthly Revenue</h2>
      <p className="hr-subtitle">
        Track this month's earnings and key performance indicators for your vacation rentals.
      </p>

      <section className="hr-host-revenues">
        <div className="hr-content">
          <div className="hr-hero-revenue">
            <RevenueOverview
              variant="hero"
              icon={<FaMoneyBillWave />}
              title="Total Revenue"
              value={`€${totalRevenue.toLocaleString()}`}
            />
          </div>

          <div className="hr-performance-overview">
            <h3 className="hr-section-title">Performance Overview</h3>
            <div className="hr-performance-cards">
              <RevenueOverview icon={<FaBed />} title="Booked Nights" value={bookedNights.toLocaleString()} />
              <RevenueOverview icon={<FaRegClock />} title="Available Nights" value={availableNights.toLocaleString()} />
              <RevenueOverview icon={<FaBuilding />} title="Total Properties" value={propertyCount.toLocaleString()} />
              <RevenueOverview
                icon={<FaExclamationTriangle />}
                tone="warning"
                title="Gross Missed Revenue"
                value={grossMissedRevenueDisplay}
              />
            </div>
            {availableNights > 0 && (
              <p className="hr-occupancy-summary">
                {bookedNights.toLocaleString()} of {availableNights.toLocaleString()} nights booked (
                {occupancyRate.toFixed(0)}% occupancy)
              </p>
            )}
          </div>

          <div className="hr-monthly-comparison">
            <MonthlyComparison
              hostId={cognitoUserId}
              kpiAll={monthlyKpiAll}
              totalRevenue={totalRevenue}
              bookedNights={bookedNights}
              availableNights={availableNights}
            />
          </div>

          <div className="hr-report-card">
            <p className="hr-report-text">Export a CSV summary of this month's revenue and performance data.</p>
            <button type="button" className="hr-download-btn" onClick={handleDownloadReport}>
              Download Report
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HostRevenues;
