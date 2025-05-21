import React, { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import "./RevPAR.css";

const RevPARCard = () => {
    const [ownerId, setOwnerId] = useState(null); // Owner ID from Cognito
    const [revPAR, setRevPAR] = useState(0); // RevPAR value
    const [totalRevenue, setTotalRevenue] = useState(0); // Total Revenue
    const [roomNights, setRoomNights] = useState(0); // Total Room Nights
    const [timeFilter, setTimeFilter] = useState("weekly"); // Selected filter
    const [startDate, setStartDate] = useState(""); // Custom start date
    const [endDate, setEndDate] = useState(""); // Custom end date
    const [loading, setLoading] = useState(false); // Loading state

    // Fetch Owner ID on component mount
    useEffect(() => {
        const fetchOwnerId = async () => {
            try {
                const user = await Auth.currentUserInfo();
                if (user?.attributes?.sub) {
                    setOwnerId(user.attributes.sub);
                } else {
                    throw new Error("Cognito User ID not found");
                }
            } catch (error) {
                console.error("Error fetching Owner ID:", error);
            }
        };

        fetchOwnerId();
    }, []);

    // Fetch RevPAR Data
    useEffect(() => {
        if (ownerId && (timeFilter !== "custom" || (startDate && endDate))) {
            fetchRevPARData();
        }
    }, [ownerId, timeFilter, startDate, endDate]);

    const fetchRevPARData = async () => {
        setLoading(true);
        try {
            const response = await fetch("https://81juiz8m4f.execute-api.eu-north-1.amazonaws.com/prod/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    OwnerID: ownerId,
                    rangeType: timeFilter,
                    StartDate: timeFilter === "custom" ? startDate : null,
                    EndDate: timeFilter === "custom" ? endDate : null,
                }),
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            setRevPAR(data.RevPAR || 0);
            setTotalRevenue(data.totalRevenue || 0);
            setRoomNights(data.totalRoomNights || 0);
        } catch (error) {
            console.error("Error fetching RevPAR data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rp-revpar-card">
            <h3>RevPAR</h3>
            {/* Time Filter Dropdown */}
            <div className="time-filter">
                <label htmlFor="timeFilter">Time Filter:</label>
                <select
                    id="timeFilter"
                    value={timeFilter}
                    className="timeFilter"
                    onChange={(e) => setTimeFilter(e.target.value)}
                >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                </select>
            </div>

            {/* Custom Date Range Picker */}
            {timeFilter === "custom" && (
                <div className="rp-custom-dates">
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

            {/* Loading or Data Display */}
            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="rp-revpar-details">
                    <p>Total Revenue: ${totalRevenue}</p>
                    <p>Total Room Nights: {roomNights}</p>
                    <p>RevPAR: ${revPAR}</p>
                </div>
            )}
        </div>
    );
};

export default RevPARCard;