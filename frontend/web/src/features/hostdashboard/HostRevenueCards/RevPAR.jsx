import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./KpiCard.scss"; 
import "./RevPAR.scss"; 
import { RevPARService } from "../services/RevParService.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const RevPARCard = ({ refreshKey }) => {
  const [cognitoUserId, setCognitoUserId] = useState(null);

  const [revPAR, setRevPAR] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [availableNights, setAvailableNights] = useState(0);
  const [chartData, setChartData] = useState([]);

  const [timeFilter, setTimeFilter] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(false);
  const fetchingRef = useRef(false);

  const lastRef = useRef({
    totalRevenue: null,
    availableNights: null,
    revPAR: null,
    chartKey: "",
  });

  useEffect(() => {
    isMountedRef.current = true;

    const fetchUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        if (isMountedRef.current) setCognitoUserId(user.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito User ID:", err);
        if (isMountedRef.current) setError("Failed to authenticate user");
      }
    };

    fetchUser();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const getWeekNumber = (date) => {
    const temp = new Date(date);
    temp.setHours(0, 0, 0, 0);
    temp.setDate(temp.getDate() + 4 - (temp.getDay() || 7));
    const yearStart = new Date(temp.getFullYear(), 0, 1);
    return Math.ceil(((temp - yearStart) / MS_PER_DAY + 1) / 7);
  };

  const getLastMonths = (count = 6) => {
    const months = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      months.push({
        label: monthDate.toLocaleString("default", { month: "short" }),
        start,
        end,
      });
    }

    return months;
  };

  const getLastWeeks = (count = 6) => {
    const weeks = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - 7 * i);

      const start = new Date(end);
      start.setDate(start.getDate() - 6);

      weeks.push({
        label: `Week ${getWeekNumber(end)}`,
        start,
        end,
      });
    }

    return weeks;
  };

  const canFetch = useCallback(() => {
    if (!cognitoUserId) return false;
    if (timeFilter === "custom" && (!startDate || !endDate)) return false;
    return true;
  }, [cognitoUserId, timeFilter, startDate, endDate]);

  const buildChartKey = (data) => (data || []).map((d) => `${d.label}:${Number(d.revPAR || 0)}`).join("|");

  const fetchComparisonData = useCallback(
    async (userId) => {
      const periods = timeFilter === "weekly" ? getLastWeeks(6) : getLastMonths(6);

      const results = [];
      for (const p of periods) {
        try {
          const res = await RevPARService.getRevPARMetrics(
            userId,
            "custom",
            p.start.toISOString().split("T")[0],
            p.end.toISOString().split("T")[0]
          );

          const value = Math.max(0, parseFloat(res.revPAR) || 0);

          results.push({ label: p.label, revPAR: value });
        } catch (err) {
          console.warn(`Failed for ${p.label}:`, err);
          results.push({ label: p.label, revPAR: 0 });
        }
      }

      return results;
    },
    [timeFilter]
  );

  const fetchMetrics = useCallback(
    async ({ silent = false } = {}) => {
      if (!canFetch()) return;
      if (!isMountedRef.current) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const summary =
          timeFilter === "custom"
            ? await RevPARService.getRevPARMetrics(cognitoUserId, "custom", startDate, endDate)
            : await RevPARService.getRevPARMetrics(cognitoUserId, timeFilter);

        if (!isMountedRef.current) return;

        const nextTotalRev =
          typeof summary.totalRevenue === "object"
            ? summary.totalRevenue.totalRevenue
            : summary.totalRevenue;

        const nextAvailable =
          typeof summary.availableNights === "object"
            ? summary.availableNights.availableNights
            : summary.availableNights;

        const nextRevparVal = parseFloat(summary.revPAR) || 0;

        if (lastRef.current.totalRevenue !== (nextTotalRev || 0)) {
          setTotalRevenue(nextTotalRev || 0);
          lastRef.current.totalRevenue = nextTotalRev || 0;
        }

        const nextAvailNum = Number(nextAvailable) || 0;
        if (lastRef.current.availableNights !== nextAvailNum) {
          setAvailableNights(nextAvailNum);
          lastRef.current.availableNights = nextAvailNum;
        }

        if (lastRef.current.revPAR !== (nextRevparVal || 0)) {
          setRevPAR(nextRevparVal || 0);
          lastRef.current.revPAR = nextRevparVal || 0;
        }

        const chart = await fetchComparisonData(cognitoUserId);
        const nextChartKey = buildChartKey(chart);

        if (lastRef.current.chartKey !== nextChartKey) {
          setChartData(chart);
          lastRef.current.chartKey = nextChartKey;
        }

        if (!silent) setError(null);
      } catch (err) {
        console.error("Error fetching RevPAR metrics:", err);

        if (!silent && isMountedRef.current) setError("Failed to fetch RevPAR metrics");

        if (!silent && isMountedRef.current) {
          setRevPAR(0);
          setTotalRevenue(0);
          setAvailableNights(0);
          setChartData([]);
          lastRef.current = {
            totalRevenue: 0,
            availableNights: 0,
            revPAR: 0,
            chartKey: "",
          };
        }
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [canFetch, cognitoUserId, timeFilter, startDate, endDate, fetchComparisonData]
  );

  useEffect(() => {
    if (!canFetch()) return;
    fetchMetrics({ silent: false });
  }, [canFetch, fetchMetrics]);

  useEffect(() => {
    if (!canFetch()) return;
    fetchMetrics({ silent: true });
  }, [refreshKey, canFetch, fetchMetrics]);

  const allZero = !chartData || chartData.every((item) => item.revPAR === 0);
  const displayData = allZero ? [{ label: "No Data", revPAR: 1 }] : chartData;

  return (
    <div className="kpi-card revpar-card">
      <h3>RevPAR</h3>

      <div className="time-filter">
        <label>Time Filter:</label>
        <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {timeFilter === "custom" && (
        <div className="custom-date-filter">
          <div>
            <label>Start Date:</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label>End Date:</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      )}

      <div className="kpi-body">
        <div className="adr-details">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <>
              <p>
                <strong>Total Revenue:</strong> €{Number(totalRevenue).toLocaleString()}
              </p>
              <p>
                <strong>Available Nights:</strong> {Number(availableNights).toLocaleString()}
              </p>
              <p>
                <strong>RevPAR:</strong> €{Number(revPAR).toLocaleString()}
              </p>
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="revpar-barchart">
            <div className="bar-wrapper">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={displayData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  {!allZero && <Legend />}

                  <Bar
                    dataKey="revPAR"
                    fill={allZero ? "#ccc" : "#0d9813"}
                    radius={[6, 6, 0, 0]}
                    barSize={25}
                  />

                  {allZero && (
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="14"
                      fill="#999"
                    >
                      No Data
                    </text>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevPARCard;
