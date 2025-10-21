import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import "./OccupancyRate.scss"; // keep styling consistent

const BASE_URL = "https://3biydcr59g.execute-api.eu-north-1.amazonaws.com/default/";

const OccupancyRate = () => {
  const [occupancyRate, setOccupancyRate] = useState(0);
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

  // convert yyyy-mm-dd -> dd-mm-yyyy for backend
  const formatForBackend = (isoDate) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split("-");
    return `${d}-${m}-${y}`;
  };

  // Get Cognito user ID
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        console.log("Fetched Cognito User ID:", userInfo.attributes.sub);
        setCognitoUserId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito User ID:", err);
        setError("User not logged in.");
      }
    };
    fetchUserId();
  }, []);

  // Fetch Occupancy Rate from backend
  const fetchOccupancyRateData = async () => {
    if (!cognitoUserId) return;

    setLoading(true);
    setError(null);
    console.log("Fetching occupancy rate with:", {
      periodType,
      startDate,
      endDate,
      cognitoUserId,
    });

    try {
      const session = await Auth.currentSession();
      const token = session.getAccessToken().getJwtToken();

      let url = `${BASE_URL}?hostId=${cognitoUserId}&metric=occupancyRate&filterType=${periodType}`;
      if (periodType === "custom" && startDate && endDate) {
        url += `&startDate=${formatForBackend(startDate)}&endDate=${formatForBackend(endDate)}`;
      }

      console.log("Request URL:", url);

      const resp = await fetch(url, {
        method: "GET",
        headers: { Authorization: token },
      });

      let data = await resp.json();
      console.log("Raw response:", data);

      // unwrap body if returned as string
      if (data?.body && typeof data.body === "string") {
        data = JSON.parse(data.body);
        console.log("Parsed body:", data);
      }

      // normalize occupancyRate value
      let rate = 0;
      if (typeof data === "number") rate = data;
      else if (data?.occupancyRate) rate = parseFloat(data.occupancyRate);
      else if (data?.occupancy_rate) rate = parseFloat(data.occupancy_rate);
      else if (data?.value) rate = parseFloat(data.value);

      if (!Number.isFinite(rate)) rate = 0;

      console.log("Final occupancy rate:", rate);
      setOccupancyRate(Number(rate.toFixed(2)));
    } catch (err) {
      console.error("Error fetching occupancy rate:", err);
      setError(err.message || "Failed to fetch occupancy rate.");
      setOccupancyRate(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cognitoUserId) return;
    if (periodType === "custom" && (!startDate || !endDate)) return;
    fetchOccupancyRateData();
  }, [periodType, startDate, endDate, cognitoUserId]);

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
              <label>Start Date : </label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label>End Date : </label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
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
