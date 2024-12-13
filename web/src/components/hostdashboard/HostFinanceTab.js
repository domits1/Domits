import React, { useEffect, useState } from 'react';
import Pages from "./Pages.js";
import './HostFinanceTab.css';
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";

const HostFinanceTab = () => {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState(null);
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
    const [bankDetailsProvided, setBankDetailsProvided] = useState(null);
    const [loading, setLoading] = useState(true);

    const handleEnlistNavigation = () => {
        navigate('/enlist');
    };

    const handleNavigation = (value) => {
        navigate(value);
    };

    useEffect(() => {
        const setUserEmailAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserEmail(userInfo.attributes.email);
                setCognitoUserId(userInfo.attributes.sub);

                const response = await fetch(`https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: userInfo.attributes.sub }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();

                const parsedBody = JSON.parse(data.body);

                if (parsedBody.hasStripeAccount) {
                    setStripeLoginUrl(parsedBody.loginLinkUrl);
                    setBankDetailsProvided(parsedBody.bankDetailsProvided);
                }
            } catch (error) {
                console.error("Error fetching user data or Stripe status:", error);
            } finally {
                setLoading(false);
            }
        };
        setUserEmailAsync();
    }, []);

    async function handleStripeAction() {
        if (userEmail && cognitoUserId) {
            const options = {
                userEmail: userEmail,
                cognitoUserId: cognitoUserId,
            };
            try {
                const response = await fetch('https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount', {
                    method: 'POST',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                window.location.replace(data.url);
            } catch (error) {
                console.error("Error during Stripe action:", error);
            }
        } else {
            console.error('User email or cognitoUserId is not defined.');
        }
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    console.log("Stripe Login URL:", stripeLoginUrl);
    console.log("Bank Details Provided:", bankDetailsProvided);

    return (
        <main className="page-Host">
            <div className="sidebar">
                <Pages />
            </div>
            <section className="host-pc-finance">
                <div className="finance-content">
                    <h1>Finance</h1>
                    <h2>Ready to receive payments?</h2>
                    <h3>
                        <ul>
                            <li>
                                1. Create an accommodation first before you proceed to the next step:
                                <span className="finance-span" onClick={handleEnlistNavigation}>
                                    Create Accommodation
                                </span>
                            </li>
                            <br />
                            <li className="finance-li">
                                {stripeLoginUrl ? (
                                    bankDetailsProvided ? (
                                        <>2. You are connected to Stripe!</>
                                    ) : (
                                        <>2. Your payment details are not provided yet, make sure to{" "}
                                            <span
                                                className="finance-span"
                                                onClick={handleStripeAction}
                                            >
                                                finish your Stripe onboarding
                                            </span> before you proceed.
                                        </>
                                    )
                                ) : (
                                    <>2. Once your accommodation is created, you can create a Stripe account to receive payments:
                                        <span className="finance-span" onClick={() => handleStripeAction()}>
                                            Domits Stripe
                                        </span>
                                    </>
                                )}
                            </li>
                            <br />
                            <li>
                                3. Set your accommodation live at
                                <span onClick={() => handleNavigation("/hostdashboard/listings")} className="finance-span">
                                    listings!
                                </span>
                            </li>
                        </ul>
                    </h3>
                </div>
            </section>
        </main>
    );
}

export default HostFinanceTab;
