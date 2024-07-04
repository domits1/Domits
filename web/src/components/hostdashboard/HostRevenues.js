import React from 'react';
import Pages from "./Pages.js";

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

    const getRedirectUri = () => {
        const hostname = window.location.hostname;
        if (hostname === 'domits.com') {
            return 'https://domits.com/stripe/callback';
        } else {
            return 'https://acceptance.domits.com/stripe/callback';
        }
    };

    const handleStripeOAuth = async () => {
        try {
            // Check if the user already has a connected Stripe account
            const response = await fetch('https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();

            if (data.stripeAccountId) {
                // If the user already has a connected Stripe account, set the account ID
                setStripeAccountId(data.stripeAccountId);
            } else {
                // If the user doesn't have a connected Stripe account, initiate OAuth
                const clientId = 'ca_PULlrr0bwd0krdUxRljDVciQ6B5wUZPZ';
                const redirectUri = getRedirectUri();
                const state = userId;
                const stripeOAuthUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${state}`;
                console.log("Redirecting to Stripe OAuth URL:", stripeOAuthUrl);
                window.location.href = stripeOAuthUrl;
            }
        } catch (error) {
            console.error("Error checking Stripe account:", error);
        }
    };

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
            <section className='host-revenues' style={{
                display: "flex",
                flexDirection: "row"
            }}>
                <Pages />
                <div className="content">
                    <h1>Coming soon...</h1>
                </div>
            </section>
        </main>
    );
}

export default HostRevenues;
