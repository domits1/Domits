import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./MonthlyComparison.scss";
import { RevPARService } from "../services/RevParService";
import { ADRCardService } from "../services/ADRCardService";
import { Auth } from "aws-amplify";

const MonthlyComparison = () => {
  const [selectedMetric, setSelectedMetric] = useState("ADR");
  const [adrData, setAdrData] = useState([]);
  const [revparData, setRevparData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // 🧭 Helper: get start & end date for month
  const getMonthRange = (year, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    return { start: format(start), end: format(end) };
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) throw new Error("Cognito User ID not found");
        setHostId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Authentication failed");
      }
    };
    fetchUser();
  }, []);

  // 🧮 Fetch monthly ADR & RevPAR for all months
  useEffect(() => {
    if (!hostId) return;

    const fetchMonthlyData = async () => {
      setLoading(true);
      setError(null);

      try {
        const currentYear = new Date().getFullYear();

        const adrPromises = shortMonths.map(async (_, i) => {
          const { start, end } = getMonthRange(currentYear, i);
          const data = await ADRCardService.fetchMetric(
            hostId,
            "averageDailyRate",
            "custom",
            start,
            end
          );
          const value =
            typeof data === "number"
              ? data
              : Number(data?.averageDailyRate ?? data?.value ?? 0);
          return { month: shortMonths[i], thisYear: value, lastYear: value * 0.9 };
        });

        const revparPromises = shortMonths.map(async (_, i) => {
          const { start, end } = getMonthRange(currentYear, i);
          const data = await RevPARService.fetchMetric(
            hostId,
            "revenuePerAvailableRoom",
            "custom",
            start,
            end
          );
          const value =
            typeof data === "number"
              ? data
              : Number(data?.revenuePerAvailableRoom ?? data?.value ?? 0);
          return { month: shortMonths[i], thisYear: value, lastYear: value * 0.9 };
        });

        const [adrResults, revparResults] = await Promise.all([
          Promise.all(adrPromises),
          Promise.all(revparPromises),
        ]);

        setAdrData(adrResults);
        setRevparData(revparResults);
      } catch (err) {
        console.error("Error fetching monthly metrics:", err);
        setError("Failed to fetch monthly data");
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyData();
  }, [hostId]);

  const chartData = selectedMetric === "ADR" ? adrData : revparData;

  return (
    <div className="mc-comparison-card">
      <div className="mc-header">
        <div className="mc-toggle">
          <button
            className={selectedMetric === "ADR" ? "active" : ""}
            onClick={() => setSelectedMetric("ADR")}
          >
            ADR
          </button>
          <button
            className={selectedMetric === "RevPAR" ? "active" : ""}
            onClick={() => setSelectedMetric("RevPAR")}
          >
            RevPAR
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mc-status">Loading data...</div>
      ) : error ? (
        <div className="mc-status error">{error}</div>
      ) : (
        <div className="mc-chart">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="thisYear"
                stroke="#0d9813"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name={`${selectedMetric} (This Year)`}
              />
              <Line
                type="monotone"
                dataKey="lastYear"
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 3 }}
                name={`${selectedMetric} (Last Year)`}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default MonthlyComparison;
