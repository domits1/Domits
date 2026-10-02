import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import "./MonthlyComparison.scss";

import { HostKpiAllService } from "../services/HostKpiAllService";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const METRIC_INFO = {
  OCC: { label: "Occupancy Rate", key: "occ", format: (v) => `${Number(v).toFixed(1)}%` },
  ADR: { label: "Average Daily Rate", key: "adr", format: (v) => `€${Number(v).toLocaleString()}` },
  RevPAR: { label: "RevPAR", key: "revpar", format: (v) => `€${Number(v).toLocaleString()}` },
  ALOS: { label: "Average Length of Stay", key: "alos", format: (v) => `${Number(v).toFixed(1)} nights` },
};

const getMonthRange = (year, monthIndex) => {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  const format = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: format(start), end: format(end) };
};

const extractAlos = (raw) => Number(raw?.averageLengthOfStay?.averageLengthOfStay ?? raw?.averageLengthOfStay ?? 0);

const yTickFormatter = (selectedMetric) => (v) =>
  selectedMetric === "ALOS" ? `${v}` : selectedMetric === "OCC" ? `${v}%` : `€${v}`;

const tooltipFormatter = (selectedMetric) => (v) =>
  selectedMetric === "ALOS" ? `${v} nights` : selectedMetric === "OCC" ? `${v}%` : `€${v}`;

const MonthlyComparison = ({ hostId, kpiAll, totalRevenue = 0, bookedNights = 0, availableNights = 0 }) => {
  const [selectedMetric, setSelectedMetric] = useState("OCC");
  const [monthlyTrend, setMonthlyTrend] = useState({ occ: [], adr: [], revpar: [], alos: [] });
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);

  const isMountedRef = useRef(false);
  // The 12-month trend only needs to load once per host, not on every parent
  // poll tick (that data doesn't change meaningfully every 2 seconds, and the
  // old implementation refetching it on every refresh was a major source of
  // redundant API calls).
  const trendFetchedForHostRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMonthlyTrend = useCallback(async () => {
    if (!hostId) return;
    if (trendFetchedForHostRef.current === hostId) return;
    trendFetchedForHostRef.current = hostId;

    setTrendLoading(true);
    setTrendError(null);

    try {
      const year = new Date().getFullYear();
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, monthIndex) => {
          const { start, end } = getMonthRange(year, monthIndex);
          return HostKpiAllService.fetchAll(hostId, "custom", start, end);
        })
      );

      if (!isMountedRef.current) return;

      const occ = [];
      const adr = [];
      const revpar = [];
      const alos = [];

      results.forEach((raw, monthIndex) => {
        const month = SHORT_MONTHS[monthIndex];
        occ.push({ month, value: Number(raw?.occupancyRate ?? 0) });
        adr.push({ month, value: Number(raw?.averageDailyRate ?? 0) });
        revpar.push({ month, value: Number(raw?.revenuePerAvailableRoom ?? 0) });
        alos.push({ month, value: extractAlos(raw) });
      });

      setMonthlyTrend({ occ, adr, revpar, alos });
    } catch {
      if (isMountedRef.current) {
        trendFetchedForHostRef.current = null;
        setTrendError("Failed to fetch monthly trend");
      }
    } finally {
      if (isMountedRef.current) setTrendLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    fetchMonthlyTrend();
  }, [fetchMonthlyTrend]);

  const activeMetric = METRIC_INFO[selectedMetric];

  const metrics = {
    occ: Number(kpiAll?.occupancyRate ?? 0),
    adr: Number(kpiAll?.averageDailyRate ?? 0),
    revpar: Number(kpiAll?.revenuePerAvailableRoom ?? 0),
    alos: extractAlos(kpiAll),
  };
  const currentValue = metrics[activeMetric.key];
  const hasData = kpiAll != null && Number(currentValue) !== 0;

  const trendData = monthlyTrend[activeMetric.key] || [];
  const hasTrendData = trendData.some((point) => Number(point.value || 0) !== 0);

  const renderVisual = () => {
    if (selectedMetric === "OCC") {
      const pct = Math.min(Math.max(metrics.occ, 0), 100);
      return (
        <div className="mc-visual">
          <div className="mc-bar-track">
            <div className="mc-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="mc-visual-caption">
            {bookedNights.toLocaleString()} of {availableNights.toLocaleString()} available nights booked this month
          </p>
        </div>
      );
    }

    if (selectedMetric === "ADR") {
      const potentialRevenue = metrics.adr * availableNights;
      return (
        <div className="mc-visual">
          <div className="mc-stat-block">
            <span className="mc-stat-value">€{metrics.adr.toLocaleString()}</span>
            <span className="mc-stat-label">average rate per booked night</span>
          </div>
          {availableNights > 0 && metrics.adr > 0 && (
            <p className="mc-visual-caption">
              At this rate, fully booking all {availableNights.toLocaleString()} available nights would generate €
              {potentialRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} this month
            </p>
          )}
        </div>
      );
    }

    if (selectedMetric === "RevPAR") {
      const gap = Math.max(metrics.adr - metrics.revpar, 0);
      return (
        <div className="mc-visual">
          <div className="mc-stat-block">
            <span className="mc-stat-value">€{metrics.revpar.toLocaleString()}</span>
            <span className="mc-stat-label">revenue per available night</span>
          </div>
          {metrics.adr > 0 && gap > 0 && (
            <p className="mc-visual-caption">
              €{gap.toLocaleString(undefined, { maximumFractionDigits: 0 })} below your €
              {metrics.adr.toLocaleString()} nightly rate, the gap left by nights that went unsold this month
            </p>
          )}
        </div>
      );
    }

    if (selectedMetric === "ALOS") {
      const cap = 10;
      const filled = Math.min(Math.round(metrics.alos), cap);
      return (
        <div className="mc-visual">
          <div className="mc-nights-row">
            {Array.from({ length: cap }, (_, i) => (
              <span key={i} className={`mc-night-dot ${i < filled ? "filled" : ""}`} />
            ))}
          </div>
          <p className="mc-visual-caption">Guests stay {metrics.alos.toFixed(1)} nights on average this month</p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="mc-comparison-card">
      <div className="mc-header">
        <h3 className="mc-title">Key Metrics Detail</h3>
        <div className="mc-toggle">
          {["OCC", "ADR", "RevPAR", "ALOS"].map((m) => (
            <button key={m} className={selectedMetric === m ? "active" : ""} onClick={() => setSelectedMetric(m)}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="mc-summary">
        <div className="mc-summary-header">
          <span className="mc-metric-name">
            {activeMetric.label} <span className="mc-metric-abbr">({selectedMetric})</span>
          </span>
          <span className="mc-metric-value">{hasData ? activeMetric.format(currentValue) : "No data available"}</span>
        </div>

        <div className="mc-breakdown-row">
          <div className="mc-breakdown-item">
            <span className="mc-breakdown-label">Total Revenue</span>
            <span className="mc-breakdown-value">€{Number(totalRevenue).toLocaleString()}</span>
          </div>
          <div className="mc-breakdown-item">
            <span className="mc-breakdown-label">Booked Nights</span>
            <span className="mc-breakdown-value">{Number(bookedNights).toLocaleString()}</span>
          </div>
        </div>

        {renderVisual()}
      </div>

      <div className="mc-chart-section">
        <h4 className="mc-chart-title">{activeMetric.label} this year</h4>
        {trendLoading ? (
          <div className="mc-status">Loading chart…</div>
        ) : trendError ? (
          <div className="mc-status error">{trendError}</div>
        ) : (
          <div className="mc-chart mc-chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={yTickFormatter(selectedMetric)} />
                <Tooltip formatter={tooltipFormatter(selectedMetric)} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d9813"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  name={activeMetric.label}
                />
              </LineChart>
            </ResponsiveContainer>
            {!hasTrendData && <div className="mc-no-data-overlay">No data</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyComparison;
