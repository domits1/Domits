import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import Pages from "./Pages.js";
import './HostRevenueStyle.css'

const HostRevenues = () => {
    const [userId, setUserId] = useState(null);
    const [data, setData] = useState(null);

    const formatData = (items) => {
        // Filter accepted bookings and format prices
        return items
            .filter(item => item.Status === 'accepted')
            .map((item) => ({
                price: item.Price,
                date: new Date(item.BookingDate).toLocaleDateString() // Ensure BookingDate is a proper date
            }));
    };

    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                console.log("User Info:", userInfo);
                setUserId(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error finding your user id:", error);
            }
        };
        setUserIdAsync();
    }, []);

    useEffect(() => {
        const fetchPayments = async () => {
            if (!userId) {
                console.log("No user found!");
                return;
            } else {
                try {
                    const response = await fetch('https://ct7hrhtgac.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingData');
                    console.log("Response:", response);

                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }

                    const responseData = await response.json();
                    console.log("Response Data:", responseData);

                    // Ensure responseData is an array
                    const dataArray = Array.isArray(responseData) ? responseData : [];
                    setData(dataArray);

                } catch (error) {
                    console.error("Unexpected error:", error);
                }
            }
        };

        if (userId) {
            fetchPayments();
        }
    }, [userId]);

    const formattedData = data ? formatData(data) : [];

    const chartData = {
        labels: formattedData.map(item => item.date),
        datasets: [
            {
                label: 'Price per Night',
                data: formattedData.map(item => item.price),
                fill: false,
                backgroundColor: 'rgba(75,192,192,1)',
                borderColor: 'rgba(75,192,192,1)',
            },
        ],
    };

    return (
        <main className="container">
            <section className="host-revenues">
                <div className="pages">
                    <Pages />
                </div>
                <div className="content">
                    <div className="revenue-header">
                        <h2>Revenue Recognition</h2>
                        <div className="filters">
                            <select>
                                <option>Last 12 months</option>
                                <option>Last 6 months</option>
                                <option>Last 3 months</option>
                            </select>
                            <select>
                                <option>Aug 2023 - Aug 2024</option>
                                <option>Sep 2023 - Sep 2024</option>
                            </select>
                            <div>
                                <button>Daily</button>
                                <button>Monthly</button>
                            </div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <h3>Revenue Overview</h3>
                        {data ? (
                            <Line data={chartData} />
                        ) : (
                            <p>Loading...</p>
                        )}
                    </div>
                    <div className="summary">
                        <h4>Monthly summary</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Recognised revenue previously deferred</th>
                                    <th>Revenue from unbilled services</th>
                                    <th>Less refunds</th>
                                    <th>Less disputes</th>
                                    <th>Less bad debt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>$1,216,752.67</td>
                                    <td>$4,244,870.34</td>
                                    <td>$22.38</td>
                                    <td>$8,813.74</td>
                                    <td>$190.56</td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="download-button">
                            <button>Download</button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;
