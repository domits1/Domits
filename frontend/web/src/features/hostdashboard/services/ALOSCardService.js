import React, { useState, useEffect } from "react";
import "./ALOSCard.scss";
import { HostRevenueService } from "../services/HostRevenueService";
import { ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, YAxis } from "recharts";
import { Auth } from "aws-amplify";

const ALOSCard = () => {
  const [alos, setAlos] = useState(0);
  const [trendData, setTrendData] = useState([]);
  const [filterType, setFilterType] = useState("monthly");
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
        setError("User not logged in");
      }
    };
    fetchUserId();
  }, []);

  const fetchALOS = async () => {
    if (!cognitoUserId) return;
    if (filterType === "custom" && (!startDate || !endDate)) return;

    setLoading(true);
    setError(null);

    try {
      await Auth.currentSession();

      const data = await HostRevenueService.fetchMetricData(
        cognitoUserId,
        "averageLengthOfStay",
        filterType,
        startDate,
        endDate
      );

      let value = 0;
      if (typeof data === "number") value = data;
      else if (data?.averageLengthOfStay?.averageLengthOfStay != null)
        value = Number(data.averageLengthOfStay.averageLengthOfStay);
      else if (data?.averageLengthOfStay != null) value = Number(data.averageLengthOfStay);
      else if (data?.value != null) value = Number(data.value);

      setAlos(Number(value.toFixed(2)));

      const trendArray = data?.trend ??
        data?.history ?? [
          { label: "P1", value },
          { label: "P2", value: value * 0.9 },
          { label: "P3", value: value * 1.05 },
        ];

      setTrendData(
        trendArray.map((x, i) => ({
          name: x.label || `P${i + 1}`,
          alos: Number(x.value),
        }))
      );
    } catch (err) {
      console.error("Error fetching ALOS:", err);
      setError("Failed to fetch ALOS");
      setAlos(0);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cognitoUserId) return;
    if (filterType === "custom" && (!startDate || !endDate)) return;

    fetchALOS();
  }, [cognitoUserId, filterType, startDate, endDate]);

  return (
    <div className="alos-card-container">
      <div className="alos-card card-base">
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

        <div className="alos-value">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "red" }}>Error: {error}</p>
          ) : (
            <p className="alos-number">
              <strong>{alos}</strong> nights
            </p>
          )}
        </div>

        {!loading && !error && trendData.length > 0 && (
          <div className="alos-chart">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => `${v} nights`} />
                <Line
                  type="monotone"
                  dataKey="alos"
                  stroke="#0d9813"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default ALOSCard;
