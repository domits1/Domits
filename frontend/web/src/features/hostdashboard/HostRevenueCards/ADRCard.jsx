import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import "./ADRCard.scss";
import { ADRCardService as ADRService } from "../services/ADRCardService.js";

const ADRCard = () => {
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [adr, setAdr] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [bookedNights, setBookedNights] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [timeFilter, setTimeFilter] = useState("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setCognitoUserId(user.attributes.sub);
      } catch (err) {
        setError("Failed to authenticate user");
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!cognitoUserId) return;
    if (timeFilter === "custom" && (!startDate || !endDate)) return;

    const fetchMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await ADRService.getADRMetrics(
          cognitoUserId,
          timeFilter,
          startDate,
          endDate
        );

        setAdr(results.adr || 0);
        setTotalRevenue(results.totalRevenue || 0);
        setBookedNights(results.bookedNights || 0);
        setChartData(results.chartData || []);
      } catch (err) {
        setError(err.message || "Failed to fetch ADR metrics");
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [cognitoUserId, timeFilter, startDate, endDate]);

  const donutData = [
    { name: "ADR", value: adr },
    { name: "Total Revenue", value: totalRevenue },
    { name: "Booked Nights", value: bookedNights },
  ];

  const allZero = donutData.every((item) => item.value === 0);
  const displayData = allZero ? [{ name: "No Data", value: 1 }] : donutData;
  const COLORS = ["#0d9813", "#82ca9d", "#ffc658"];

  return (
    <div className="adr-card card-base">
      <h3>Average Daily Rate</h3>

      <div className="time-filter">
        <label>Time Filter:</label>
        <select
          className="timeFilter"
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {timeFilter === "custom" && (
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

      <div className="adr-details">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : (
          <>
            <p>
              <strong>ADR:</strong> €{adr.toLocaleString()}
            </p>
            <p>
              <strong>Total Revenue:</strong> €{totalRevenue.toLocaleString()}
            </p>
            <p>
              <strong>Booked Nights:</strong> {bookedNights.toLocaleString()}
            </p>
          </>
        )}
      </div>

      {!loading && !error && (
        <div className="adr-donut-chart">
          <div className="donut-wrapper">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={displayData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  label={!allZero}
                  isAnimationActive={true}
                >
                  {displayData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={allZero ? "#c7c7c7" : COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                {allZero && (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fill="#777"
                  >
                    No Data
                  </text>
                )}

                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

      <div className="adr-details">
        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p style={{ color: "red" }}>Error: {error}</p>
        ) : (
          <>
            <p>
              <strong>ADR:</strong> €{adr.toLocaleString()}
            </p>
            <p>
              <strong>Total Revenue:</strong> €{totalRevenue.toLocaleString()}
            </p>
            <p>
              <strong>Booked Nights:</strong> {bookedNights.toLocaleString()}
            </p>
          </>
        )}
      </div>

      {!loading && !error && (
        <div className="adr-donut-chart">
          <div className="donut-wrapper">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={displayData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  label={!allZero}
                  isAnimationActive
                >
                  {displayData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={allZero ? "#c7c7c7" : COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>

                {allZero && (
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="14"
                    fill="#777"
                  >
                    No Data
                  </text>
                )}

                <Tooltip />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ADRCard;
