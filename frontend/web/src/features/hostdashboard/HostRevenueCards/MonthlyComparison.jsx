import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import "./MonthlyComparison.scss";

import { RevPARService } from "../services/RevParService";
import { ADRCardService } from "../services/ADRCardService";
import { HostRevenueService } from "../services/HostRevenueService";

import { Auth } from "aws-amplify";

const MonthlyComparison = () => {
  const [selectedMetric, setSelectedMetric] = useState("ADR");
  const [adrData, setAdrData] = useState([]);
  const [revparData, setRevparData] = useState([]);
  const [alosData, setAlosData] = useState([]);

  const [loading, setLoading] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);

  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const getMonthRange = (year, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: format(start), end: format(end) };
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setHostId(user.attributes.sub);
      } catch {
        setError("Authentication failed");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!hostId) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
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
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [hostId]);

  const chartData = selectedMetric === "ADR" ? adrData : selectedMetric === "RevPAR" ? revparData : alosData;

  return (
    <div className="mc-comparison-card">
      <div className="mc-header">
        <div className="mc-toggle">
          <button className={selectedMetric === "ADR" ? "active" : ""} onClick={() => setSelectedMetric("ADR")}>
            ADR
          </button>
          <button className={selectedMetric === "RevPAR" ? "active" : ""} onClick={() => setSelectedMetric("RevPAR")}>
            RevPAR
          </button>
          <button className={selectedMetric === "ALOS" ? "active" : ""} onClick={() => setSelectedMetric("ALOS")}>
            ALOS
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mc-status">Loading chart...</div>
      ) : error ? (
        <div className="mc-status error">{error}</div>
      ) : (
        <div className="mc-chart">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => (selectedMetric === "ALOS" ? `${v}` : `$${v}`)} />
              <Tooltip formatter={(v) => (selectedMetric === "ALOS" ? `${v} nights` : `$${v}`)} />
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
                stroke="#999"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="4 4"
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
