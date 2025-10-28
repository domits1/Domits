import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import "./OccupancyRate.scss";
import { OccupancyRateService } from "../services/OccupancyRateService.js";

const OccupancyRate = () => {
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

 
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub)
          throw new Error("Cognito User ID not found");
        setCognitoUserId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito User ID:", err);
        setError("User not logged in.");
      }
    };
    fetchUserId();
  }, []);

  const fetchOccupancyRate = async () => {
    if (!cognitoUserId) return;
    if (periodType === "custom" && (!startDate || !endDate)) return;

    setLoading(true);
    setError(null);

    try {
      const rate = await OccupancyRateService.fetchOccupancyRate(
        cognitoUserId,
        periodType,
        startDate,
        endDate
      );

      setOccupancyRate(rate);
    } catch (err) {
      console.error("Error fetching occupancy rate:", err);
      setError(err.message || "Failed to fetch occupancy rate.");
      setOccupancyRate(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOccupancyRate();
  }, [cognitoUserId, periodType, startDate, endDate]);

  return (
    <div className="booked-nights-card-container">
      <div className="booked-nights-card occupancy-rate-card">
        <h3>Occupancy Rate</h3>

        <div className="time-filter">
          <label htmlFor="periodType">Time Filter:</label>
          <select
            id="periodType"
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {periodType === "custom" && (
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

        <div className="booked-nights-details">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <p className="hr-card-value">{occupancyRate}%</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OccupancyRate;
