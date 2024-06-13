import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import Pages from "./Pages.js";
import './HostRevenueStyle.css';

const HostRevenues = () => {
    const [userId, setUserId] = useState(null);
    const [data, setData] = useState(null);

    const formatBalanceData = (balance) => {
        // Extract data from balance object
        return balance.available.map(item => ({
            amount: item.amount / 100,  // Stripe returns amount in cents, convert to dollars
            date: new Date(item.created * 1000).toLocaleDateString()  // Convert timestamp to date
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
        const fetchBalanceData = async () => {
            if (!userId) {
                console.log("No user found!");
                return;
            } else {
                try {
                    const response = await fetch('https://9zagimrvq0.execute-api.eu-north-1.amazonaws.com/test/test');
                    console.log("Response:", response);

                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }

                    const responseData = await response.json();
                    console.log("Response Data:", responseData);
                    setData(responseData);

                } catch (error) {
                    console.error("Unexpected error:", error);
                }
            }
        };

        if (userId) {
            fetchBalanceData();
        }
    }, [userId]);

    const formattedData = data ? formatBalanceData(data) : [];

    const chartData = {
        labels: formattedData.map(item => item.date),
        datasets: [
            {
                label: 'Available Balance',
                data: formattedData.map(item => item.amount),
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
                    <div className="chart-container">
                        <h3>Revenue Overview</h3>
                        {data ? (
                            <Line data={chartData} />
                        ) : (
                            <p>Loading...</p>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;
