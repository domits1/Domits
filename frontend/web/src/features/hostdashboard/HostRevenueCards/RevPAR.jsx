import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
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

  const fetchMetrics = async () => {
    if (!cognitoUserId) return;
    setLoading(true);
    setError(null);

    try {
      const results = await RevPARService.getRevPARMetrics(
        cognitoUserId,
        timeFilter,
        startDate,
        endDate
      );

      setRevPAR(results.revPAR || 0);
      setTotalRevenue(results.totalRevenue || 0);
      setAvailableNights(results.availableNights || 0);
      setChartData(results.chartData || []);
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
    if (cognitoUserId && (timeFilter !== "custom" || (startDate && endDate))) {
      fetchMetrics();
    }
  }, [cognitoUserId, timeFilter, startDate, endDate]);

  return (
    <div className="adr-card-container">
      <div className="adr-card">
        <h3>RevPAR</h3>

        <div className="time-filter">
          <label>Time Filter:</label>
          <select
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
                <strong>Total Revenue:</strong> ${totalRevenue}
              </p>
              <p>
                <strong>Available Nights:</strong> {availableNights}
              </p>
              <p>
                <strong>RevPAR:</strong> ${revPAR}
              </p>
            </>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="adr-graph">
          <h3>RevPAR Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revPAR"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RevPARCard;
