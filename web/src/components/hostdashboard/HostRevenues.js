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

    // Fetch the current user's information
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

    // Handle Stripe OAuth flow initiation
    const handleStripeOAuth = () => {
        const clientId = 'ca_PULlrr0bwd0krdUxRljDVciQ6B5wUZPZ';
        const redirectUri = 'https://domits.com/stripe/callback'; // Replace with your redirect URI
        const state = userId;
        const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${state}`;
        console.log("Redirecting to Stripe OAuth URL:", stripeOAuthUrl);
        window.location.href = stripeOAuthUrl;
    };

    // Handle the OAuth callback
    useEffect(() => {
        const fetchStripeAccount = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');

            console.log("URL Params:", window.location.search);
            console.log("Code:", code);
            console.log("State:", state);

            if (code && state) {
                try {
                    const response = await fetch('https://jhkeknu1w3.execute-api.eu-north-1.amazonaws.com/dev', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            code: code,
                            state: state,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to exchange authorization code for access token');
                    }

                    const data = await response.json();
                    console.log("Stripe Account Data:", data);
                    setStripeAccountId(data.stripe_user_id);
                } catch (error) {
                    console.error("OAuth Error:", error);
                }
            }
        };

        if (!stripeAccountId) {
            fetchStripeAccount();
        }
    }, [stripeAccountId]);

    // Fetch payments data from Stripe
    useEffect(() => {
        const fetchStripePaymentsData = async () => {
            if (!stripeAccountId) {
                return;
            }
            try {
                const response = await fetch(`https://api.stripe.com/v1/payment_intents?limit=10`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`, // Replace with your Stripe secret key
                        'Stripe-Account': stripeAccountId,
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch payment intents');
                }

                const data = await response.json();
                console.log("Payments Data:", data);
                setPaymentsData(data.data);
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
                    <button onClick={handleStripeOAuth}>Connect with Stripe</button>
                </div>
            </section>
        </main>
    );
};

export default HostRevenues;
