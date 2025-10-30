import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";

const ALOSCard = () => {
  const [alos, setAlos] = useState(0);
  const [filterType, setFilterType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        if (!userInfo?.attributes?.sub) throw new Error("Cognito user ID not found");
        setCognitoUserId(userInfo.attributes.sub);
      } catch (err) {
        console.error("Error fetching Cognito User ID:", err);
        setError("User not logged in.");
      }
    };
    fetchUserId();
  }, []);

  const fetchALOS = async () => {
    if (!cognitoUserId) return;
    setLoading(true);
    setError(null);

    try {
      const value = await ALOSService.fetchALOS(cognitoUserId, filterType, startDate, endDate);
      setAlos(value);
    } catch (err) {
      console.error("Error fetching ALOS:", err);
      setError(err.message || "Failed to fetch ALOS");
      setAlos(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cognitoUserId && (filterType !== "custom" || (startDate && endDate))) {
      fetchALOS();
    }
  }, [cognitoUserId, filterType, startDate, endDate]);

  return (
    <div className="adr-card-container">
      <div className="adr-card">
        <h3>Average Length of Stay</h3>

        <div className="time-filter">
          <label>Time Filter:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {filterType === "custom" && (
          <div className="custom-date-filter">
            <div>
              <label>Start Date:</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label>End Date:</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="adr-details">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <p>
              <strong>{alos}</strong> nights
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ALOSCard;
