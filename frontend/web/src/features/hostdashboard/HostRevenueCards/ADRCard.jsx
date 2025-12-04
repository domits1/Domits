import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import "./KpiCard.scss";      
import "./ADRCard.scss";      
import { ADRCardService as ADRService } from "../services/ADRCardService.js";

const ADRCard = ({ refreshKey }) => {
  const [cognitoUserId, setCognitoUserId] = useState(null);

  const [adr, setAdr] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [bookedNights, setBookedNights] = useState(0);

  const [timeFilter, setTimeFilter] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);
  const fetchingRef = useRef(false);

  const lastRef = useRef({
    adr: null,
    totalRevenue: null,
    bookedNights: null,
    chartKey: "",
  });

  useEffect(() => {
    isMountedRef.current = true;

    Auth.currentAuthenticatedUser()
      .then((user) => {
        if (isMountedRef.current) setCognitoUserId(user.attributes.sub);
      })
      .catch(() => {
        if (isMountedRef.current) setError("Failed to authenticate user");
      });

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canFetch = useCallback(() => {
    if (!cognitoUserId) return false;
    if (timeFilter === "custom" && (!startDate || !endDate)) return false;
    return true;
  }, [cognitoUserId, timeFilter, startDate, endDate]);

  const safeValue = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const buildChartKey = (data) => {
    if (!Array.isArray(data)) return "";
    return data.map((d) => `${d?.name ?? ""}:${Number(d?.value ?? 0)}`).join("|");
  };

  const fetchMetrics = useCallback(
    async ({ silent = false } = {}) => {
      if (!canFetch() || !isMountedRef.current) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const results = await ADRService.getADRMetrics(
          cognitoUserId,
          timeFilter,
          startDate,
          endDate
        );

        if (!isMountedRef.current || !results) return;

        const nextAdr = safeValue(results.adr);
        const nextTotalRevenue = safeValue(results.totalRevenue);
        const nextBookedNights = safeValue(results.bookedNights);

        const nextChartData = Array.isArray(results.chartData) ? results.chartData : [];
        const nextChartKey = buildChartKey(nextChartData);

        if (lastRef.current.adr !== nextAdr) {
          setAdr(nextAdr);
          lastRef.current.adr = nextAdr;
        }

        if (lastRef.current.totalRevenue !== nextTotalRevenue) {
          setTotalRevenue(nextTotalRevenue);
          lastRef.current.totalRevenue = nextTotalRevenue;
        }

        if (lastRef.current.bookedNights !== nextBookedNights) {
          setBookedNights(nextBookedNights);
          lastRef.current.bookedNights = nextBookedNights;
        }

        if (lastRef.current.chartKey !== nextChartKey) {
          lastRef.current.chartKey = nextChartKey;
        }

        if (!silent) setError(null);
      } catch (e) {
        if (!silent && isMountedRef.current) setError("Failed to fetch ADR metrics");
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [canFetch, cognitoUserId, timeFilter, startDate, endDate]
  );

  useEffect(() => {
    if (!canFetch()) return;
    fetchMetrics({ silent: false });
  }, [canFetch, fetchMetrics]);

  useEffect(() => {
    if (!canFetch()) return;
    fetchMetrics({ silent: true });
  }, [refreshKey, canFetch, fetchMetrics]);

  const donutData = [
    { name: "ADR", value: safeValue(adr) },
    { name: "Total Revenue", value: safeValue(totalRevenue) },
    { name: "Booked Nights", value: safeValue(bookedNights) },
  ];

  const allZero = donutData.every((i) => i.value === 0);
  const displayData = allZero ? [{ name: "No Data", value: 1 }] : donutData;

  const COLORS = ["#0d9813", "#82ca9d", "#ffc658"];

  return (
    <div className="kpi-card adr-card">
      <h3>Average Daily Rate</h3>

      <div className="time-filter">
        <label>Time Filter:</label>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {timeFilter === "custom" && (
        <div className="custom-date-filter">
          <div>
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="kpi-body">
        <div className="adr-details">
          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <>
              <p>
                <strong>ADR:</strong> €{safeValue(adr).toLocaleString()}
              </p>
              <p>
                <strong>Total Revenue:</strong> €{safeValue(totalRevenue).toLocaleString()}
              </p>
              <p>
                <strong>Booked Nights:</strong> {safeValue(bookedNights).toLocaleString()}
              </p>
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="adr-donut-chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={displayData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  isAnimationActive={true}
                >
                  {displayData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={allZero ? "#ccc" : COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ADRCard;