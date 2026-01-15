import React, { useState, useEffect } from "react";
import "./ALOSCard.scss";
import { HostRevenueService } from "../services/HostRevenueService";
import { ResponsiveContainer, LineChart, Line, Tooltip, CartesianGrid, YAxis } from "recharts";

const ALOSCard = ({ hostId }) => {
  const [alos, setAlos] = useState(0);
  const [trendData, setTrendData] = useState([]);
  const [filterType, setFilterType] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchALOS = async () => {
    if (!hostId) return;
    if (filterType === "custom" && (!startDate || !endDate)) return;

    setLoading(true);
    try {
      const data = await HostRevenueService.fetchMetricData(
        hostId,
        "averageLengthOfStay",
        filterType,
        startDate,
        endDate
      );

      let value = 0;
      if (typeof data === "number") value = data;
      else if (data?.averageLengthOfStay) value = Number(data.averageLengthOfStay.averageLengthOfStay ?? data.averageLengthOfStay);
      else if (data?.value != null) value = Number(data.value);

      setAlos(Number(value.toFixed(2)));

      setTrendData(
        (data?.trend ?? []).map((t, i) => ({
          name: t.label || `P${i + 1}`,
          alos: Number(t.value),
        }))
      );
    } catch (err) {
      setError("Failed to fetch ALOS");
      setAlos(0);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchALOS();
  }, [filterType, startDate, endDate, hostId]);

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
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        )}

        <div className="alos-value">
          {loading ? <p>Loading...</p> :
           error ? <p style={{ color: "red" }}>{error}</p> :
           <p className="alos-number"><strong>{alos}</strong> nights</p>}
        </div>

        {!loading && !error && trendData.length > 0 && (
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => `${v} nights`} />
              <Line type="monotone" dataKey="alos" stroke="#0d9813" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ALOSCard;
