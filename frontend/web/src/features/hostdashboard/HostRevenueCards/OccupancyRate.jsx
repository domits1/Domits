import React, { useState, useEffect, useRef, useCallback } from "react";
import { Auth } from "aws-amplify";
import "./KpiCard.scss";          
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
  const lastRateRef = useRef(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchUserId = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        if (isMountedRef.current) setCognitoUserId(user.attributes.sub);
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
      if (!isMountedRef.current) return;
      if (fetchingRef.current) return;

      fetchingRef.current = true;

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const rate = await OccupancyRateService.fetchOccupancyRate(
          cognitoUserId,
          periodType,
          startDate,
          endDate
        );

        if (!isMountedRef.current) return;

        const nextRate = Number(rate) || 0;

        if (lastRateRef.current !== nextRate) {
          setOccupancyRate(nextRate);
          lastRateRef.current = nextRate;
        }

        if (!silent) setError(null);
      } catch (err) {
        console.error("Error fetching occupancy rate:", err);
        if (!isMountedRef.current) return;

        if (!silent) setError(err.message || "Failed to fetch occupancy rate.");

        setOccupancyRate(0);
        lastRateRef.current = 0;
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [canFetch, cognitoUserId, periodType, startDate, endDate]
  );

  useEffect(() => {
    if (!canFetch()) return;
    fetchOccupancyRate({ silent: false });
  }, [canFetch, fetchOccupancyRate]);

  useEffect(() => {
    if (!canFetch()) return;
    fetchOccupancyRate({ silent: true });
  }, [refreshKey, canFetch, fetchOccupancyRate]);

  return (
    <div className="kpi-card occupancy-rate-card">
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

      <div className="kpi-body">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : (
          <p className="occupancy-rate-value">
            <strong>{Number(occupancyRate).toLocaleString()}%</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default OccupancyRate;
