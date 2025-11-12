import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import "./BookedNights.scss";
import { BookedNightsService } from "../services/BookedNightService.js";

const BookedNights = () => {
  const [bookedNights, setBookedNights] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setCognitoUserId(user.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito user ID:", err);
        setError("User not logged in.");
      }
    };
    fetchUserId();
  }, []);

  const fetchBookedNights = async () => {
    if (!cognitoUserId) return;
    setLoading(true);
    setError(null);

    try {
      const nights = await BookedNightsService.fetchBookedNights(
        cognitoUserId,
        periodType,
        startDate,
        endDate
      );
      setBookedNights(nights);
    } catch (err) {
      console.error("Error fetching booked nights:", err);
      setError(err.message || "Failed to fetch booked nights.");
      setBookedNights(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cognitoUserId) fetchBookedNights();
  }, [periodType, startDate, endDate, cognitoUserId]);

  return (
    <div className="booked-nights-card-container">
      <div className="booked-nights-card">
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

        <div className="booked-nights-details">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <p className="hr-card-value">{bookedNights.toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookedNights;
