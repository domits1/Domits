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
import { HostRevenueService } from "../services/HostRevenueService";
import { OccupancyRateService } from "../services/OccupancyRateService";

import { Auth } from "aws-amplify";

const MonthlyComparison = () => {
  const [selectedMetric, setSelectedMetric] = useState("OCC"); // OCC first
  const [adrData, setAdrData] = useState([]);
  const [revparData, setRevparData] = useState([]);
  const [alosData, setAlosData] = useState([]);
  const [occData, setOccData] = useState([]); // NEW

  const [loading, setLoading] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [error, setError] = useState(null);

  const shortMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const getMonthRange = (year, monthIndex) => {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    const format = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    return { start: format(start), end: format(end) };
  };

  // Get Auth User
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

  // Fetch all metrics monthly
  useEffect(() => {
    if (!hostId) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const year = new Date().getFullYear();

        // ADR
        const adrPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);
          return ADRCardService.fetchMetric(
            hostId,
            "averageDailyRate",
            "custom",
            start,
            end
          ).then((data) => {
            const value =
              typeof data === "number"
                ? data
                : Number(data?.averageDailyRate ?? data?.value ?? 0);
            return {
              month: shortMonths[i],
              thisYear: value,
              lastYear: value * 0.9,
            };
          });
        });

        // RevPAR
        const revparPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);
          return RevPARService.fetchMetric(
            hostId,
            "revenuePerAvailableRoom",
            "custom",
            start,
            end
          ).then((data) => {
            const value =
              typeof data === "number"
                ? data
                : data?.revenuePerAvailableRoom ?? data?.value ?? 0;

            return {
              month: shortMonths[i],
              thisYear: value,
              lastYear: value * 0.9,
            };
          });
        });

        // ALOS
        const alosPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);

          return HostRevenueService.fetchMetricData(
            hostId,
            "averageLengthOfStay",
            "custom",
            start,
            end
          ).then((data) => {
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

        // NEW — OCCUPANCY RATE
        const occPromises = shortMonths.map((_, i) => {
          const { start, end } = getMonthRange(year, i);

          return OccupancyRateService.fetchOccupancyRate(
            hostId,
            "custom",
            start,
            end
          ).then((rate) => {
            const value = typeof rate === "number" ? rate : Number(rate ?? 0);

            return {
              month: shortMonths[i],
              thisYear: value,
              lastYear: value * 0.9,
            };
          });
        });

        // Wait for all
        const [adrRes, revparRes, alosRes, occRes] = await Promise.all([
          Promise.all(adrPromises),
          Promise.all(revparPromises),
          Promise.all(alosPromises),
          Promise.all(occPromises),
        ]);

        setAdrData(adrRes);
        setRevparData(revparRes);
        setAlosData(alosRes);
        setOccData(occRes);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch monthly comparison data");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [hostId]);

  // Chart data selector
  const chartData =
    selectedMetric === "OCC"
      ? occData
      : selectedMetric === "ADR"
      ? adrData
      : selectedMetric === "RevPAR"
      ? revparData
      : alosData;

  return (
    <div className="mc-comparison-card">
      <div className="mc-header">
        <div className="mc-toggle">
          {/* OCCUPANCY FIRST */}
          <button
            className={selectedMetric === "OCC" ? "active" : ""}
            onClick={() => setSelectedMetric("OCC")}
          >
            OCC
          </button>

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

          <button
            className={selectedMetric === "ALOS" ? "active" : ""}
            onClick={() => setSelectedMetric("ALOS")}
          >
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
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />

              {/* Y-axis format based on metric */}
              <YAxis
                tickFormatter={(v) =>
                  selectedMetric === "ALOS"
                    ? `${v}`
                    : selectedMetric === "OCC"
                    ? `${v}%`
                    : `$${v}`
                }
              />

              <Tooltip
                formatter={(v) =>
                  selectedMetric === "ALOS"
                    ? `${v} nights`
                    : selectedMetric === "OCC"
                    ? `${v}%`
                    : `$${v}`
                }
              />

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
