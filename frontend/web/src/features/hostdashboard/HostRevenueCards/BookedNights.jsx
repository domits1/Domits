import React, { useState, useEffect, useCallback, useRef } from "react";
import { Auth } from "aws-amplify";
import "./KpiCard.scss";       
import "./BookedNights.scss";   
import { BookedNightsService } from "../services/BookedNightService.js";

const BookedNights = ({ refreshKey }) => {
  const [bookedNights, setBookedNights] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

  const isMountedRef = useRef(false);
  const lastValueRef = useRef(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const fetchUserId = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        if (!isMountedRef.current) return;
        setCognitoUserId(user.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito user ID:", err);
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

  const fetchBookedNights = useCallback(
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
        const nights = await BookedNightsService.fetchBookedNights(
          cognitoUserId,
          periodType,
          startDate,
          endDate
        );

        if (!isMountedRef.current) return;

        const next = Number(nights) || 0;

        if (lastValueRef.current !== next) {
          setBookedNights(next);
          lastValueRef.current = next;
        }

        if (!silent) setError(null);
      } catch (err) {
        console.error("Error fetching booked nights:", err);
        if (!isMountedRef.current) return;

        if (!silent) setError(err.message || "Failed to fetch booked nights.");

        setBookedNights(0);
        lastValueRef.current = 0;
      } finally {
        fetchingRef.current = false;
        if (!silent && isMountedRef.current) setLoading(false);
      }
    },
    [canFetch, cognitoUserId, periodType, startDate, endDate]
  );

  useEffect(() => {
    if (!canFetch()) return;
    fetchBookedNights({ silent: false });
  }, [canFetch, fetchBookedNights]);

  useEffect(() => {
    if (!canFetch()) return;
    fetchBookedNights({ silent: true });
  }, [refreshKey, canFetch, fetchBookedNights]);

  return (
    <div className="kpi-card booked-nights-card">
      <h3>Booked Nights</h3>

      <div className="time-filter">
        <label htmlFor="periodType">Time Filter:</label>
        <select
          id="periodType"
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value)}
        >
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
          <p className="booked-nights-value">
            <strong>{Number(bookedNights).toLocaleString()}</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default BookedNights;