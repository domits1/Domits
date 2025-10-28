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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) throw new Error("Cognito User ID not found");
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
      const results = await ADRService.getADRMetrics(
        cognitoUserId,
        timeFilter,
        startDate,
        endDate
      );

      setAdr(results.adr || 0);
      setTotalRevenue(results.totalRevenue || 0);
      setBookedNights(results.bookedNights || 0);
      setChartData(results.chartData || []);
    } catch (err) {
      console.error("Error fetching ADR metrics:", err);
      setError(err.message || "Failed to fetch ADR metrics");
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

        <div className="adr-details">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <>
              <p>
                <strong>ADR:</strong> ${adr}
              </p>
              <p>
                <strong>Total Revenue:</strong> ${totalRevenue}
              </p>
              <p>
                <strong>Booked Nights:</strong> {bookedNights}
              </p>
            </>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="adr-graph">
          <h3>ADR Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="adr" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default ADRCard;
