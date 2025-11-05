import React, { useState, useEffect } from "react";
<<<<<<< HEAD
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./MonthlyComparison.scss";

import { RevPARService } from "../services/RevParService";
import { ADRCardService } from "../services/ADRCardService";
import { HostRevenueService } from "../services/HostRevenueService";

import { Auth } from "aws-amplify";

=======
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

>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
const MonthlyComparison = () => {
  const [selectedMetric, setSelectedMetric] = useState("ADR");
  const [adrData, setAdrData] = useState([]);
  const [revparData, setRevparData] = useState([]);
<<<<<<< HEAD
  const [alosData, setAlosData] = useState([]);

=======
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
  const [loading, setLoading] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

<<<<<<< HEAD
=======
  // 🧭 Helper: get start & end date for month
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
  const getMonthRange = (year, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const format = (d) =>
<<<<<<< HEAD
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
=======
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
    return { start: format(start), end: format(end) };
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
<<<<<<< HEAD
        const user = await Auth.currentAuthenticatedUser();
        setHostId(user.attributes.sub);
      } catch {
=======
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) throw new Error("Cognito User ID not found");
        setHostId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Auth error:", err);
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
        setError("Authentication failed");
      }
    };
    fetchUser();
  }, []);

<<<<<<< HEAD
  useEffect(() => {
    if (!hostId) return;

    const fetchAll = async () => {
=======
  // 🧮 Fetch monthly ADR & RevPAR for all months
  useEffect(() => {
    if (!hostId) return;

    const fetchMonthlyData = async () => {
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
      setLoading(true);
      setError(null);

      try {
<<<<<<< HEAD
        const year = new Date().getFullYear();

        const adrPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);
          return ADRCardService.fetchMetric(hostId, "averageDailyRate", "custom", start, end).then((data) => {
            const value = typeof data === "number" ? data : Number(data?.averageDailyRate ?? data?.value ?? 0);
            return { month: shortMonths[i], thisYear: value, lastYear: value * 0.9 };
          });
        });

        const revparPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);
          return RevPARService.fetchMetric(hostId, "revenuePerAvailableRoom", "custom", start, end).then((data) => {
            const value = typeof data === "number" ? data : Number(data?.revenuePerAvailableRoom ?? data?.value ?? 0);
            return { month: shortMonths[i], thisYear: value, lastYear: value * 0.9 };
          });
        });

        const alosPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);
          return HostRevenueService.fetchMetricData(hostId, "averageLengthOfStay", "custom", start, end).then((data) => {
            const value =
              data?.averageLengthOfStay?.averageLengthOfStay ??
              data?.averageLengthOfStay ??
              data?.value ??
              data ??
              0;
            return {
              month: shortMonths[i],
              thisYear: Number(value),
              lastYear: Number(value) * 0.9,
            };
          });
        });

        const [adrRes, revparRes, alosRes] = await Promise.all([
          Promise.all(adrPromises),
          Promise.all(revparPromises),
          Promise.all(alosPromises),
        ]);

        setAdrData(adrRes);
        setRevparData(revparRes);
        setAlosData(alosRes);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch monthly comparison data");
=======
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
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
      } finally {
        setLoading(false);
      }
    };

<<<<<<< HEAD
    fetchAll();
  }, [hostId]);

  const chartData = selectedMetric === "ADR" ? adrData : selectedMetric === "RevPAR" ? revparData : alosData;
=======
    fetchMonthlyData();
  }, [hostId]);

  const chartData = selectedMetric === "ADR" ? adrData : revparData;
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)

  return (
    <div className="mc-comparison-card">
      <div className="mc-header">
        <div className="mc-toggle">
<<<<<<< HEAD
          <button className={selectedMetric === "ADR" ? "active" : ""} onClick={() => setSelectedMetric("ADR")}>
            ADR
          </button>
          <button className={selectedMetric === "RevPAR" ? "active" : ""} onClick={() => setSelectedMetric("RevPAR")}>
            RevPAR
          </button>
          <button className={selectedMetric === "ALOS" ? "active" : ""} onClick={() => setSelectedMetric("ALOS")}>
            ALOS
          </button>
=======
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
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
        </div>
      </div>

      {loading ? (
<<<<<<< HEAD
        <div className="mc-status">Loading chart...</div>
=======
        <div className="mc-status">Loading data...</div>
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
      ) : error ? (
        <div className="mc-status error">{error}</div>
      ) : (
        <div className="mc-chart">
          <ResponsiveContainer width="100%" height={350}>
<<<<<<< HEAD
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => (selectedMetric === "ALOS" ? `${v}` : `$${v}`)} />
              <Tooltip formatter={(v) => (selectedMetric === "ALOS" ? `${v} nights` : `$${v}`)} />
=======
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
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
<<<<<<< HEAD
                stroke="#999"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="4 4"
=======
                stroke="#82ca9d"
                strokeWidth={2}
                dot={{ r: 3 }}
>>>>>>> e45c67103 (visual van adr en revpar afgemaakt)
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
