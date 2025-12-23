import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import "./OccupancyRate.scss";
import { OccupancyRateService } from "../services/OccupancyRateService.js";

const OccupancyRate = ({ refreshKey }) => {
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

  const isMountedRef = useRef(false);

  // cache last value so we only update when changed
  const lastRateRef = useRef(null);

  // Get User ID
  useEffect(() => {
    isMountedRef.current = true;

    const fetchUserId = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        if (!isMountedRef.current) return;
        setCognitoUserId(user.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito User ID:", err);
        if (isMountedRef.current) setError("User not logged in.");
      }
    };

    fetchUserId();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canFetch = useCallback(() => {
    if (!cognitoUserId) return false;
    if (periodType === "custom" && (!startDate || !endDate)) return false;
    return true;
  }, [cognitoUserId, periodType, startDate, endDate]);

  const fetchOccupancyRate = useCallback(
    async ({ silent = false } = {}) => {
      if (!canFetch()) return;

      if (!silent) setLoading(true);
      if (!silent) setError(null);

      try {
        const rate = await OccupancyRateService.fetchOccupancyRate(
          cognitoUserId,
          periodType,
          startDate,
          endDate
        );

        if (!isMountedRef.current) return;

        const nextRate = Number(rate) || 0;

        // Only update when changed
        if (lastRateRef.current !== nextRate) {
          setOccupancyRate(nextRate);
          lastRateRef.current = nextRate;
        }
      } catch (err) {
        console.error("Error fetching occupancy rate:", err);
        if (!isMountedRef.current) return;

        if (!silent) setError(err.message || "Failed to fetch occupancy rate.");

        setOccupancyRate(0);
        lastRateRef.current = 0;
      } finally {
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [canFetch, cognitoUserId, periodType, startDate, endDate]
  );

  // Fetch on filter changes (normal)
  useEffect(() => {
    if (!canFetch()) return;
    fetchOccupancyRate({ silent: false });
  }, [canFetch, fetchOccupancyRate]);

  // ✅ Parent-triggered refresh (silent)
  useEffect(() => {
    if (!canFetch()) return;
    fetchOccupancyRate({ silent: true });
  }, [refreshKey, canFetch, fetchOccupancyRate]);

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
