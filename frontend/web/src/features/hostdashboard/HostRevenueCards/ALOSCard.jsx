import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ALOSCard.scss";
import { HostRevenueService } from "../services/HostRevenueService";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  CartesianGrid,
  YAxis,
} from "recharts";

const ALOSCard = ({ hostId, refreshKey }) => {
  const [alos, setAlos] = useState(0);
  const [trendData, setTrendData] = useState([]);
  const [filterType, setFilterType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);
  const fetchingRef = useRef(false);

  // Cache last values so we only update when changed
  const lastAlosRef = useRef(null);
  const lastTrendKeyRef = useRef("");

  const canFetch = useCallback(() => {
    if (!hostId) return false;
    if (filterType === "custom" && (!startDate || !endDate)) return false;
    return true;
  }, [hostId, filterType, startDate, endDate]);

  const parseResponse = (data) => {
    let value = 0;

    if (typeof data === "number") value = data;
    else if (data?.averageLengthOfStay)
      value = Number(
        data.averageLengthOfStay.averageLengthOfStay ?? data.averageLengthOfStay
      );
    else if (data?.value != null) value = Number(data.value);

    const parsedAlos = Number(Number(value).toFixed(2));

    const parsedTrend = (data?.trend ?? []).map((t, i) => ({
      name: t.label || `P${i + 1}`,
      alos: Number(t.value),
    }));

    const trendKey = parsedTrend.map((p) => `${p.name}:${p.alos}`).join("|");
    return { parsedAlos, parsedTrend, trendKey };
  };

  const fetchALOS = useCallback(
    async ({ silent = false } = {}) => {
      if (!canFetch()) return;
      if (!isMountedRef.current) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;

      if (!silent) {
        setError(null);
        setLoading(true);
      }

      try {
        const data = await HostRevenueService.fetchMetricData(
          hostId,
          "averageLengthOfStay",
          filterType,
          startDate,
          endDate
        );

        if (!isMountedRef.current) return;

        const { parsedAlos, parsedTrend, trendKey } = parseResponse(data);

        if (lastAlosRef.current !== parsedAlos) {
          setAlos(parsedAlos);
          lastAlosRef.current = parsedAlos;
        }

        if (lastTrendKeyRef.current !== trendKey) {
          setTrendData(parsedTrend);
          lastTrendKeyRef.current = trendKey;
        }

        if (!silent) setError(null);
      } catch (err) {
        if (!isMountedRef.current) return;

        // show error only on non-silent (optional)
        if (!silent) setError("Failed to fetch ALOS");

        setAlos(0);
        setTrendData([]);
        lastAlosRef.current = 0;
        lastTrendKeyRef.current = "";
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [canFetch, hostId, filterType, startDate, endDate]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch on dependency changes (normal)
  useEffect(() => {
    fetchALOS({ silent: false });
  }, [fetchALOS]);

  // ✅ Parent-triggered refresh (silent)
  useEffect(() => {
    fetchALOS({ silent: true });
  }, [refreshKey, fetchALOS]);

  return (
    <div className="alos-card-container">
      <div className="alos-card card-base">
        <h3>Average Length of Stay</h3>

        <div className="time-filter">
          <label>Time Filter:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {filterType === "custom" && (
          <div className="custom-date-filter">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        <div className="alos-value">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>{error}</p>
          ) : (
            <p className="alos-number">
              <strong>{alos}</strong> nights
            </p>
          )}
        </div>

        {!loading && !error && trendData.length > 0 && (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => `${v} nights`} />
              <Line
                type="monotone"
                dataKey="alos"
                stroke="#0d9813"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ALOSCard;
