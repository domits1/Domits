import React, { useState, useEffect, useRef, useCallback } from "react";
import "./MonthlyComparison.scss";

import { HostKpiAllService } from "../services/HostKpiAllService";

const METRIC_INFO = {
  OCC: { label: "Occupancy Rate", key: "occ", format: (v) => `${Number(v).toFixed(1)}%` },
  ADR: { label: "Average Daily Rate", key: "adr", format: (v) => `€${Number(v).toLocaleString()}` },
  RevPAR: { label: "RevPAR", key: "revpar", format: (v) => `€${Number(v).toLocaleString()}` },
  ALOS: { label: "Average Length of Stay", key: "alos", format: (v) => `${Number(v).toFixed(1)} nights` },
};

const MonthlyComparison = ({ hostId, refreshKey, totalRevenue = 0, bookedNights = 0 }) => {
  const [selectedMetric, setSelectedMetric] = useState("OCC");
  const [metrics, setMetrics] = useState({ occ: 0, adr: 0, revpar: 0, alos: 0 });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);
  const fetchingRef = useRef(false);
  const refreshTimerRef = useRef(null);

  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: format(start), end: format(end) };
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const fetchMetrics = useCallback(
    async ({ silent = false } = {}) => {
      if (!hostId) return;
      if (!isMountedRef.current) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;
      setError(null);

      if (!silent) setLoading(true);

      try {
        const { start, end } = getCurrentMonthRange();
        const allRaw = await HostKpiAllService.fetchAll(hostId, "custom", start, end);

        if (!isMountedRef.current) return;

        const alosValRaw = allRaw?.averageLengthOfStay?.averageLengthOfStay ?? allRaw?.averageLengthOfStay ?? 0;

        setMetrics({
          occ: Number(allRaw?.occupancyRate ?? 0),
          adr: Number(allRaw?.averageDailyRate ?? 0),
          revpar: Number(allRaw?.revenuePerAvailableRoom ?? 0),
          alos: Number(alosValRaw) || 0,
        });

        if (!silent) setError(null);
      } catch {
        if (!silent && isMountedRef.current) {
          setError("Failed to fetch key metrics");
        }
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [hostId]
  );

  useEffect(() => {
    if (!hostId) return;
    fetchMetrics({ silent: false });
  }, [hostId, fetchMetrics]);

  useEffect(() => {
    if (!hostId) return;

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchMetrics({ silent: true });
    }, 300);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refreshKey, hostId, fetchMetrics]);

  const activeMetric = METRIC_INFO[selectedMetric];
  const currentValue = metrics[activeMetric.key];
  const hasData = Number(currentValue) !== 0;

  let content;

  if (loading) {
    content = <div className="mc-status">Loading metrics…</div>;
  } else if (error) {
    content = <div className="mc-status error">{error}</div>;
  } else {
    content = (
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
      </div>
    );
  }

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

      {content}
    </div>
  );
};

export default MonthlyComparison;
