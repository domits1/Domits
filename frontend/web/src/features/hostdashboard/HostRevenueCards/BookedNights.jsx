import React, { useState, useEffect } from "react";
import axios from "axios";
import { useUser } from '../../auth/UserContext';
import "./BookedNights.scss";

const BookedNights = () => {
    const { user } = useUser(); // Access user and loading state from UserContext
    const [bookedNights, setBookedNights] = useState(null);
    const [periodType, setPeriodType] = useState("monthly"); // Default to "monthly"
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch Booked Nights
    const fetchBookedNights = async (filter) => {
        if (!user || !user.attributes?.sub) {
            console.error("Host ID is not available.");
            setBookedNights("N/A");
            return;
        }

        const hostId = user.attributes.sub;

        setLoading(true);
        setError(null);

        try {
            const payload = {
                periodType: filter,
                hostId,
                ...(filter === "custom" && { startDate, endDate }), // Include dates only if custom selected
            };


            const response = await axios.post(
                "https://yjzk78t2u0.execute-api.eu-north-1.amazonaws.com/prod/Host-Revenues-Production-Read-BookedNights",
                payload,
                { headers: { "Content-Type": "application/json" } }
            );


            if (response.data && "bookedNights" in response.data) {
                setBookedNights(response.data.bookedNights || 0);
            } else {
                setBookedNights("N/A");
            }
        } catch (err) {
            console.error("Error fetching booked nights:", err.message || err);
            setError(err.message || "An error occurred while fetching booked nights.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch data when filters change
    useEffect(() => {
        if (periodType === "monthly") {
            fetchBookedNights("monthly");
        } else if (periodType === "custom" && startDate && endDate) {
            fetchBookedNights("custom");
        }
    }, [periodType, startDate, endDate]);

    return (
        <div className="booked-nights-card-container">
            <div>
                <div className="booked-nights-card">
                    <h3>Booked Nights</h3>
                    <div className="time-filter">
                        <label htmlFor="periodType">Time Filter:</label>
                        <select
                            id="periodType"
                            value={periodType}
                            className="timeFilter"
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
                    <div className="booked-nights-details">
                        {loading ? (
                            <p1>Loading...</p1>
                        ) : error ? (
                            <p style={{ color: "red" }}>Error: {error}</p>
                        ) : (
                            <>
                                <p2>
                                    {bookedNights}
                                </p2>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookedNights;