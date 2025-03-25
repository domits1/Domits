import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";
import "./styles/ADRCard.css";
import { Auth } from "aws-amplify";

const ADRCard = () => {
    const [adr, setAdr] = useState(null);
    const [totalRevenue, setTotalRevenue] = useState(null);
    const [roomsSold, setRoomsSold] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [timeFilter, setTimeFilter] = useState("monthly");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchHostId = async () => {
        try {
            const userInfo = await Auth.currentUserInfo();
            return userInfo.attributes.sub;
        } catch (error) {
            console.error("Error fetching Host ID:", error);
            throw new Error("Failed to fetch Host ID.");
        }
    };

    const fetchADRData = async (filter) => {
        setLoading(true);
        setError(null); // Reset error before fetch
        try {
            const hostId = await fetchHostId();
            if (!hostId) throw new Error("Host ID is required but not found.");

            const payload = {
                hostId,
                periodType: filter,
                ...(filter === "custom" && { startDate, endDate }),
            };

            console.log("Sending Payload:", payload);

            const response = await axios.post(
                "https://2ab5eb6gs6.execute-api.eu-north-1.amazonaws.com/prod/calculateADR",
                payload,
                { headers: { "Content-Type": "application/json" } }
            );

            console.log("API Response:", response.data);

            const { ADR, totalRevenue, roomsSold, dailyMetrics } = response.data;

            setAdr(ADR ?? 0);
            setTotalRevenue(totalRevenue ?? 0);
            setRoomsSold(roomsSold ?? 0);

            if (dailyMetrics?.length) {
                setChartData(
                    dailyMetrics.map((item) => ({
                        date: item.date,
                        adr: item.adr,
                    }))
                );
            } else {
                setChartData([]);
            }
        } catch (err) {
            console.error("Error fetching ADR data:", err.message || err);
            setError(err.message || "An error occurred while fetching ADR data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (timeFilter === "monthly") {
            fetchADRData("monthly");
        } else if (timeFilter === "custom" && startDate && endDate) {
            fetchADRData("custom");
        }
    }, [timeFilter, startDate, endDate]);

    return (
        <div className="adr-card-container">
            <div>

                <div className="adr-card">
                    <h3>Average Daily Rate</h3>
                    <div className="time-filter">
                        <label htmlFor="timeFilter">Time Filter:</label>
                        <select
                            id="timeFilter"
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
                    <div className="adr-details">
                        {loading ? (
                            <p>Loading...</p>
                        ) : error ? (
                            <p style={{color: "red"}}>Error: {error}</p>
                        ) : (
                            <>
                                <p>
                                    <strong>ADR:</strong> ${adr}
                                </p>
                                <p>
                                    <strong>Total Revenue:</strong> ${totalRevenue}
                                </p>
                                <p>
                                    <strong>Rooms Sold:</strong> {roomsSold}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {chartData.length > 0 && (
                <div className="adr-graph">
                    <h3>ADR Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3"/>
                            <XAxis dataKey="date"/>
                            <YAxis/>
                            <Tooltip/>
                            <Line
                                type="monotone"
                                dataKey="adr"
                                stroke="#8884d8"
                                strokeWidth={2}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default ADRCard;