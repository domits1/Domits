import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import spinner from "../../images/spinnner.gif";
import Pages from "./Pages.js";

const HostRevenues = () => {
    const [userId, setUserId] = useState(null);
    const [data, setData] = useState(null);
    const formatData = (items) => {
        if (!Array.isArray(items)) {
            console.error("Items is not an array:", items);
            return [];
        }
        return items
            .filter(item => Array.isArray(item) && item.Status === 'Accepted')
            .map((item) => ({
                price: `€${item.Price} per night`,
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
                    const formattedData = formatData(responseData);
                    console.log("Formatted Data:", formattedData);
                    setData(formattedData);

                } catch (error) {
                    console.error("Unexpected error:", error);
                }
            }
        };

        if (userId) {
            fetchPayments();
        }
    }, [userId]);

    return (
        <main className="container">
            <section className='host-revenues' style={{ display: "flex", flexDirection: "row" }}>
                <Pages />
                <div className="content">
                    <h1>Revenue</h1>
                    {data ? (
                        <ul>
                            {data.map((item, index) => (
                                <li key={index}>{item.price}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;
