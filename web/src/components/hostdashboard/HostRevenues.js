import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import spinner from "../../images/spinnner.gif";
import Pages from "./Pages.js";

const HostRevenues = () => {
    const [userId, setUserId] = useState(null); // Changed initial state to null
    const [data, setData] = useState(null);

    useEffect(() => {
        const setUserIdAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                console.log("User Info:", userInfo); // Log user info for debugging
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
                    const response = await fetch('https://ct7hrhtgac.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingData', {
                        method: 'GET',
                        body: JSON.stringify({ HostID: userId }),
                        headers: {
                            'Content-Type': 'application/json; charset=UTF-8',
                        }
                    });

                    console.log("Response:", response); // Log the response

                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }

                    const responseData = await response.json();
                    console.log("Response Data:", responseData); // Log the response data
                    setData(responseData);

                } catch (error) {
                    console.error("Unexpected error:", error);
                }
            }
        };

        if (userId) {
            fetchPayments(); // Fetch payments when userId is set
        }
    }, [userId]);

    return (
        <main className="container">
            <section className='host-revenues' style={{ display: "flex", flexDirection: "row" }}>
                <Pages />
                <div className="content">
                    <h1>Revenue</h1>
                    {data ? (
                        <pre>{JSON.stringify(data, null, 2)}</pre> // Display data if available
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;
