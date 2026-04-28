import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./MonthlyComparison.scss";

import { HostKpiAllService } from "../services/HostKpiAllService";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MonthlyComparison = ({ hostId, refreshKey }) => {
  const [selectedMetric, setSelectedMetric] = useState("OCC");

  const [adrData, setAdrData] = useState([]);
  const [revparData, setRevparData] = useState([]);
  const [alosData, setAlosData] = useState([]);
  const [occData, setOccData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noData, setNoData] = useState(false);

  const isMountedRef = useRef(false);
  const fetchingRef = useRef(false);

  const refreshTimerRef = useRef(null);

  const lastKeysRef = useRef({
    adr: "",
    revpar: "",
    alos: "",
    occ: "",
  });

  const getMonthRange = (year, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: format(start), end: format(end) };
  };

  const buildKey = useCallback((arr) => {
    return (arr || []).map((x) => `${x.month}:${Number(x.thisYear || 0)}:${Number(x.lastYear || 0)}`).join("|");
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const fetchAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!hostId) return;
      if (!isMountedRef.current) return;

      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setError(null);
      setNoData(false);

      if (!silent) {
        setLoading(true);
      }

      try {
        const year = new Date().getFullYear();

        const adrRes = [];
        const revparRes = [];
        const alosRes = [];
        const occRes = [];

        for (let i = 0; i < 12; i++) {
          if (!isMountedRef.current) return;

          const { start, end } = getMonthRange(year, i);
          const monthLabel = SHORT_MONTHS[i];

          const allRaw = await HostKpiAllService.fetchAll(hostId, "custom", start, end);

        const adrVal = Number(allRaw?.averageDailyRate ?? 0);
        const revparVal = Number(allRaw?.revenuePerAvailableRoom ?? 0);

        const alosValRaw =
          allRaw?.averageLengthOfStay?.averageLengthOfStay ??
          allRaw?.averageLengthOfStay ??
          0;

          const alosVal = Number(alosValRaw) || 0;
          const occVal = Number(allRaw?.occupancyRate ?? 0);

          adrRes.push({ month: monthLabel, thisYear: adrVal, lastYear: null });
          revparRes.push({ month: monthLabel, thisYear: revparVal, lastYear: null });
          alosRes.push({ month: monthLabel, thisYear: alosVal, lastYear: null });
          occRes.push({ month: monthLabel, thisYear: occVal, lastYear: null });
        }

        if (!isMountedRef.current) return;

        const adrKey = buildKey(adrRes);
        if (lastKeysRef.current.adr !== adrKey) {
          setAdrData(adrRes);
          lastKeysRef.current.adr = adrKey;
        }

        const revparKey = buildKey(revparRes);
        if (lastKeysRef.current.revpar !== revparKey) {
          setRevparData(revparRes);
          lastKeysRef.current.revpar = revparKey;
        }

        const alosKey = buildKey(alosRes);
        if (lastKeysRef.current.alos !== alosKey) {
          setAlosData(alosRes);
          lastKeysRef.current.alos = alosKey;
        }

        const occKey = buildKey(occRes);
        if (lastKeysRef.current.occ !== occKey) {
          setOccData(occRes);
          lastKeysRef.current.occ = occKey;
        }
        const hasAnyData = [...adrRes, ...revparRes, ...alosRes, ...occRes].some(
  (item) => Number(item.thisYear || 0) !== 0 || Number(item.lastYear || 0) !== 0
        );

        setNoData(!hasAnyData);
        
        if (!silent) setError(null);
      } catch {
        if (!silent && isMountedRef.current) {
          setError("Failed to fetch monthly comparison data");
        }
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [hostId, buildKey]
  );

  useEffect(() => {
    if (!hostId) return;
    fetchAll({ silent: false });
  }, [hostId, fetchAll]);

  useEffect(() => {
    if (!hostId) return;

    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      fetchAll({ silent: true });
    }, 300);

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [refreshKey, hostId, fetchAll]);

  const getChartData = () => {
    switch (selectedMetric) {
      case "OCC":
        return occData;
      case "ADR":
        return adrData;
      case "RevPAR":
        return revparData;
      case "ALOS":
        return alosData;
      default:
        return [];
    }
  };

  const chartData = getChartData();

  const selectedMetricHasData = (chartData || []).some(
    (item) => Number(item.thisYear || 0) !== 0
  );

  const hasLastYearData = (chartData || []).some(
    (item) => item.lastYear !== null && item.lastYear !== undefined && Number(item.lastYear || 0) !== 0
  );

  const yTick = (v) => (selectedMetric === "ALOS" ? `${v}` : selectedMetric === "OCC" ? `${v}%` : `€${v}`);

  const tipFmt = (v) => (selectedMetric === "ALOS" ? `${v} nights` : selectedMetric === "OCC" ? `${v}%` : `€${v}`);

  let content;

  if (loading) {
    content = <div className="mc-status">Loading chart…</div>;
  } else if (error) {
    content = <div className="mc-status error">{error}</div>;
  } else {
    content = (
      <div className="mc-chart mc-chart-wrapper">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={yTick} />
            <Tooltip formatter={tipFmt} />
            <Legend />
            <Line
              type="monotone"
              dataKey="thisYear"
              stroke="#0d9813"
              strokeWidth={3}
              dot={{ r: 3 }}
              name={`${selectedMetric} (This Year)`}
            />
            {hasLastYearData ? (
              <Line
                type="monotone"
                dataKey="lastYear"
                stroke="#999"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2 }}
                name={`${selectedMetric} (Last Year)`}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>

        {(noData || !selectedMetricHasData) && (
          <div className="mc-no-data-overlay">No data</div>
        )}
      </div>
    );
  }

  return (
    <div className="mc-comparison-card">
      <div className="mc-header">
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
