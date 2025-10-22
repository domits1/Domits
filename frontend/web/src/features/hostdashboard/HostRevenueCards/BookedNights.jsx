import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import "./BookedNights.scss";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const BookedNights = () => {
  const [bookedNights, setBookedNights] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

  // Get Cognito User ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setCognitoUserId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito user ID:", err);
        setError("User not logged in.");
      }
    };
    fetchUserId();
  }, []);

  // Fetch Booked Nights
  const fetchBookedNightsData = async () => {
    if (!cognitoUserId) return;

    setLoading(true);
    setError(null);

    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();

      let url = `${BASE_URL}?hostId=${cognitoUserId}&metric=bookedNights`;
      if (periodType === "custom" && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: token },
      });

      let data = await response.json();
      if (data.body) {
        data = JSON.parse(data.body);
      }

      // Flatten object to number
      let nights = 0;
      if (data.bookedNights) {
        if (typeof data.bookedNights === "number") {
          nights = data.bookedNights;
        } else if ("bookedNights" in data.bookedNights) {
          nights = data.bookedNights.bookedNights;
        } else if ("value" in data.bookedNights) {
          nights = data.bookedNights.value;
        }
      }

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
    if (cognitoUserId) {
      fetchBookedNightsData();
    }
  }, [periodType, startDate, endDate, cognitoUserId]);

  return (
    <div className="booked-nights-card-container">
      <div className="booked-nights-card">
        <h3>Booked Nights</h3>

        {/* Filter */}
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

        {/* Custom Dates */}
        {periodType === "custom" && (
          <div className="custom-date-filter">
            <div>
              <label>Start Date : </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label>End Date : </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

   =
        <div className="booked-nights-details">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <p className="hr-card-value">{bookedNights}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookedNights;
