import React, { useState, useEffect } from "react";
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
import "./ADRCard.scss";
import { RevPARService } from "../services/RevParService.js";

const RevPARCard = () => {
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

  // ✅ Fetch Cognito user ID
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub)
          throw new Error("Cognito User ID not found");
        setCognitoUserId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito User ID:", err);
        setError(err.message);
      }
    };
    fetchUser();
  }, []);

  // ✅ Helper: Get ISO week number
  const getWeekNumber = (date) => {
    const tempDate = new Date(date);
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
    return weekNo;
  };

  // ✅ Generate last N months
  const getLastMonths = (count = 6) => {
    const months = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      months.push({
        label: d.toLocaleString("default", { month: "short" }),
        start,
        end,
      });
    }
    return months;
  };

  // ✅ Generate last N weeks (Week 42, Week 43, ...)
  const getLastWeeks = (count = 6) => {
    const weeks = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(end.getDate() - 7 * i);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const weekNumber = getWeekNumber(end);
      weeks.push({ label: `Week ${weekNumber}`, start, end });
    }
    return weeks;
  };

  // ✅ Fetch chart data (multi-period comparison)
  const fetchComparisonData = async (userId) => {
    const periods =
      timeFilter === "weekly" ? getLastWeeks(6) : getLastMonths(6);

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
        console.warn(`Failed to fetch RevPAR for ${p.label}:`, err);
        results.push({ label: p.label, revPAR: 0 });
      }
    }
    return results;
  };

  // ✅ Fetch summary + chart data
  const fetchMetrics = async () => {
    if (!cognitoUserId) return;
    setLoading(true);
    setError(null);

    try {
      let summary;
      if (timeFilter === "custom" && startDate && endDate) {
        summary = await RevPARService.getRevPARMetrics(
          cognitoUserId,
          "custom",
          startDate,
          endDate
        );
      } else {
        summary = await RevPARService.getRevPARMetrics(
          cognitoUserId,
          timeFilter
        );
      }

      // safely handle number/string/object cases
      const totalRev =
        typeof summary.totalRevenue === "object"
          ? summary.totalRevenue.totalRevenue
          : summary.totalRevenue;

      const available =
        typeof summary.availableNights === "object"
          ? summary.availableNights.availableNights
          : summary.availableNights;

      const revparVal = parseFloat(summary.revPAR) || 0;

      setTotalRevenue(Number(totalRev) || 0);
      setAvailableNights(Number(available) || 0);
      setRevPAR(Number(revparVal) || 0);

      // get chart data
      const chart = await fetchComparisonData(cognitoUserId);
      setChartData(chart);
    } catch (err) {
      console.error("Error fetching RevPAR metrics:", err);
      setError(err.message || "Failed to fetch RevPAR metrics");
      setRevPAR(0);
      setTotalRevenue(0);
      setAvailableNights(0);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      cognitoUserId &&
      (timeFilter !== "custom" || (startDate && endDate))
    ) {
      fetchMetrics();
    }
  }, [cognitoUserId, timeFilter, startDate, endDate]);

  const allZero =
    !chartData || chartData.every((item) => item.revPAR === 0);

  const displayData = allZero
    ? [{ label: "No Data", revPAR: 1 }]
    : chartData;

  return (
    <div className="adr-card card-base">
      <h3>RevPAR</h3>

      <div className="time-filter">
        <label>Time Filter:</label>
        <select
          className="timeFilter"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="weekly">Weekly</option>
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

      <div className="adr-details">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : (
          <>
            <p>
              <strong>Total Revenue:</strong> ${totalRevenue.toLocaleString()}
            </p>
            <p>
              <strong>Available Nights:</strong>{" "}
              {availableNights.toLocaleString()}
            </p>
            <p>
              <strong>RevPAR:</strong> ${revPAR.toLocaleString()}
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
                <YAxis
                  tick={{ fontSize: 12 }}
                  domain={[0, "dataMax + 20"]}
                  allowDataOverflow={false}
                />
                <Tooltip />
                {!allZero && <Legend />}
                <Bar
                  dataKey="revPAR"
                  fill={allZero ? "#ccc" : "#0d9813"}
                  radius={[6, 6, 0, 0]}
                  barSize={25}
                  isAnimationActive={true}
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
  );
};

export default RevPARCard;
