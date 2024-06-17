import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { loadStripe } from '@stripe/stripe-js';
import 'chart.js/auto';
import Pages from "./Pages.js";
import './HostRevenueStyle.css';

const stripePromise = loadStripe('pk_live_51OAG6OGiInrsWMEcQy4ohaAZyT7tEMSEs23llcw2kr2XHdAWVcB6Tm8F71wsG8rB0AHgh4SJDkyBymhi82WABR6j00zJtMkpZ1'); // Replace with your Stripe publishable key

const HostRevenues = () => {
    const [userId, setUserId] = useState(null);
    const [stripeAccountId, setStripeAccountId] = useState(null);
    const [paymentsData, setPaymentsData] = useState(null);
    const [loading, setLoading] = useState(true);

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
        const fetchStripeAccount = async () => {
            if (!userId) {
                console.log("No user found!");
                return;
            } else {
                try {
                    const response = await fetch('https://kq82anbek1.execute-api.eu-north-1.amazonaws.com/default/StripeRevenuePage', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to fetch');
                    }

                    const responseData = await response.json();
                    setStripeAccountId(responseData.stripeAccountId);
                } catch (error) {
                    console.error("Unexpected error:", error);
                }
            }
        };

        if (userId) {
            fetchStripeAccount();
        }
    }, [userId]);

    useEffect(() => {
        const fetchStripePaymentsData = async () => {
            if (!stripeAccountId) {
                return;
            }
            try {
                const stripe = await stripePromise;
                const response = await stripe.paymentIntents.list({
                    limit: 10,
                    stripeAccount: stripeAccountId,
                });

                setPaymentsData(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Unexpected error:", error);
                setLoading(false);
            }
        };

        if (stripeAccountId) {
            fetchStripePaymentsData();
        }
    }, [stripeAccountId]);

    return (
        <main className="container">
            <section className="host-revenues">
                <div className="pages">
                    <Pages />
                </div>
                <div className="content">
                    <div className="chart-container">
                        <h3>Revenue Overview</h3>
                        {loading ? (
                            <p>Loading...</p>
                        ) : (
                            paymentsData ? (
                                <div>
                                    <pre>{JSON.stringify(paymentsData, null, 2)}</pre>
                                </div>
                            ) : (
                                <p>No payment data available.</p>
                            )
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;
