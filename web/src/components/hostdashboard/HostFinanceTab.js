import React, { useEffect, useState } from 'react';
import Pages from "./Pages.js";
import './HostFinanceTab.css';
import { useNavigate } from 'react-router-dom';
import spinner from "../../images/spinnner.gif";
import stripe from "../../images/icons/stripe-icon.png";
import loading from "../hostverification/components/Loading";
import { Auth } from "aws-amplify";

const HostFinanceTab = () => {
    const navigate = useNavigate();
    const [userEmail, setUserEmail] = useState(null);
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('/hostdashboard');

    useEffect(() => {
        const setUserEmailAsync = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserEmail(userInfo.attributes.email);
                setCognitoUserId(userInfo.attributes.sub);
                const response = await fetch(`https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: userInfo.attributes.sub }),
                });
                const data = await response.json();
                if (data.hasStripeAccount) {
                    setStripeLoginUrl(data.loginLinkUrl);
                }
            } catch (error) {
                console.error("Error fetching user data or Stripe status:", error);
            } finally {
                setLoading(false);
            }
        };
        setUserEmailAsync();
    }, []);

    useEffect(() => {
        setActiveTab(location.pathname);
    }, [location.pathname]);

    async function handleStripeAction() {
        if (stripeLoginUrl) {
            window.open(stripeLoginUrl, '_blank');
        } else if (userEmail && cognitoUserId) {
            const options = {
                userEmail: userEmail,
                cognitoUserId: cognitoUserId
            };
            try {
                const result = await fetch('https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount', {
                    method: 'POST',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });
                if (!result.ok) {
                    throw new Error(`HTTP error! Status: ${result.status}`);
                }
                const data = await result.json();

                window.location.replace(data.url);
            } catch (error) {
                console.log(error);
            }
        } else {
            console.error('User email or cognitoUserId is not defined.');
        }
    }

    const handleEnlistNavigation = () => {
        navigate('/enlist');
    };
    const handleListingNavigation = () => {
        navigate('/listings');
    }

    return (
        <main className="page-body">
            <section className='host-pc' style={{
                display: "flex",
                width: "100%",
            }}>
                <Pages />
                <div className="finance-content">
                    <h1>Finance</h1>
                    <h2>Ready to receive payments?</h2>
                    <h3>
                        <ul>
                            <li>1. Create an accommodation first before you proceed to the next step: <span className="finance-span" onClick={handleEnlistNavigation}> Create Accommodation </span></li>
                            <li>
                                {stripeLoginUrl
                                    ? '2. You are connected to Stripe!'
                                    : <>
                                        <span>2. Once your accommodation is created, you can create a stripe account to receive payments: </span>
                                        <span className="finance-span" onClick={handleStripeAction}>Domits Stripe</span>
                                    </>
                                }
                            </li>
                            <li>3. Set your accommodation live at <span onClick={handleListingNavigation} className="finance-span">listings! </span></li>
                        </ul>
                        {loading && (
                            <div className="spinnerdiv">
                                <img className="spinner" src={spinner} alt="Loading" />
                            </div>
                        )}
                    </h3>
                </div>
            </section>
        </main>
    );
}

export default HostFinanceTab;
