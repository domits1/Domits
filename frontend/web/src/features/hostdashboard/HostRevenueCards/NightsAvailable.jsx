import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import "./NightsAvailable.scss";

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const NightsAvailable = () => {
  const [availableNights, setAvailableNights] = useState(0);
  const [totalProperties, setTotalProperties] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
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

  // Fetch Available Nights
  const fetchAvailableNightsData = async () => {
    if (!cognitoUserId) return;

    setLoading(true);
    setError(null);

    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();

      // Build API URL with metric
      let url = `${BASE_URL}?hostId=${cognitoUserId}&metric=availableNights`;
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

      // Flatten response
      let nights = 0;
      if (data.availableNights) {
        if (typeof data.availableNights === "number") {
          nights = data.availableNights;
        } else if ("availableNights" in data.availableNights) {
          nights = data.availableNights.availableNights;
        } else if ("value" in data.availableNights) {
          nights = data.availableNights.value;
        }
      }

      setAvailableNights(nights);

      // Optional: property count if returned
      let properties = 0;
      if (data.propertyCount) {
        if (typeof data.propertyCount === "number") properties = data.propertyCount;
        else if ("value" in data.propertyCount) properties = data.propertyCount.value;
      }
      setTotalProperties(properties);
    } catch (err) {
      console.error("Error fetching available nights:", err);
      setError(err.message || "Failed to fetch available nights.");
      setAvailableNights(0);
      setTotalProperties(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cognitoUserId) {
      fetchAvailableNightsData();
    }
  }, [periodType, startDate, endDate, cognitoUserId]);

  return (
    <div className="nights-available-card">
      <div className="nights-available-header">
        <h3>Available Nights</h3>
      </div>

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
            <label>Start Date : </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label>End Date : </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      )}

      <div className="nights-available-content">
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="nights-available-details">
            <p className="available-nights-number">{availableNights}</p>
            <p>Active Properties: {totalProperties}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NightsAvailable;
