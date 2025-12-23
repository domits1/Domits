import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import "./ADRCard.scss";
import { ADRCardService as ADRService } from "../services/ADRCardService.js";

const ADRCard = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [adr, setAdr] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [bookedNights, setBookedNights] = useState(0);
  const [chartData, setChartData] = useState([]);

  const [timeFilter, setTimeFilter] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);
  const fetching = useRef(false);

  // cache last values to avoid useless state updates
  const lastRef = useRef({
    adr: null,
    totalRevenue: null,
    bookedNights: null,
    chartKey: "",
  });

  // Load Cognito User
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

  const buildChartKey = (data) => {
    if (!Array.isArray(data)) return "";
    // stable-ish signature of chart data contents
    return data.map((d) => `${d.name ?? ""}:${Number(d.value ?? 0)}`).join("|");
  };

  // Fetch all ADR metrics (no polling, only on dependency change)
  const fetchMetrics = useCallback(async () => {
    if (!canFetch() || !isMountedRef.current) return;

    if (fetching.current) return;
    fetching.current = true;

    setLoading(true);
    setError(null);

    try {
      const results = await ADRService.getADRMetrics(
        cognitoUserId,
        timeFilter,
        startDate,
        endDate
      );

      if (!isMountedRef.current || !results) return;

      const nextAdr = Number(results.adr) || 0;
      const nextTotalRevenue = Number(results.totalRevenue) || 0;
      const nextBookedNights = Number(results.bookedNights) || 0;
      const nextChartData = results.chartData || [];
      const nextChartKey = buildChartKey(nextChartData);

      // Only update if changed
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
        setChartData(nextChartData);
        lastRef.current.chartKey = nextChartKey;
      }

      setError(null);
    } catch (e) {
      if (isMountedRef.current) setError("Failed to fetch ADR metrics");
    } finally {
      fetching.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  }, [canFetch, cognitoUserId, timeFilter, startDate, endDate]);

  // Fetch on dependency updates ONLY (removed interval polling)
  useEffect(() => {
    if (!canFetch()) return;
    fetchMetrics();
  }, [canFetch, fetchMetrics]);

  // Safe number value for chart & UI
  const safeValue = (v) => (Number.isFinite(v) ? Number(v) : 0);

  const donutData = [
    { name: "ADR", value: safeValue(adr) },
    { name: "Total Revenue", value: safeValue(totalRevenue) },
    { name: "Booked Nights", value: safeValue(bookedNights) },
  ];

  const allZero = donutData.every((i) => i.value === 0);
  const displayData = allZero ? [{ name: "No Data", value: 1 }] : donutData;

  const COLORS = ["#0d9813", "#82ca9d", "#ffc658"];

  return (
    <div className="adr-card card-base">
      <h3>Average Daily Rate</h3>

      {/* Time Filter */}
      <div className="time-filter">
        <label>Time Filter:</label>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Custom Date Filter */}
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

      {/* Metric Details */}
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

      {/* Donut Chart */}
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
  );
};

export default ADRCard;
