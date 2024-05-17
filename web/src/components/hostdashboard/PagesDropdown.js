import React, { useEffect, useState } from "react";
import spinner from "../../images/spinnner.gif";
import { useNavigate } from 'react-router-dom';
import { Auth } from "aws-amplify";
import './PagesDropdown.css';

function PagesDropdown() {
    const [userEmail, setUserEmail] = useState(null);
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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

    const handleNavigation = (event) => {
        const value = event.target.value;
        if (value === 'stripe') {
            // Special case for Stripe
            if (stripeLoginUrl) {
                window.location.href = stripeLoginUrl; // Redirect to Stripe dashboard
            } else {
                // Assume some setup method if no URL
                console.log("Set up payments");
            }
        } else if (value) {
            navigate(value);
        }
    }

    return (
        <div className="host-dropdown">
            <h1>Dashboard Navigation</h1>
            {loading ? (
                <div>
                    <img src={spinner} alt="Loading"/>
                </div>
            ) : (
                <div className="dropdown-section">
                    <div>
                        <select onChange={handleNavigation} defaultValue="Management">
                            <option disabled>Management</option>
                            <option value="/hostdashboard">Dashboard</option>
                            <option value="/hostdashboard/calendar">Calendar</option>
                            <option value="/hostdashboard/chat">Messages</option>
                            <option value="/hostdashboard/payments">Reporting</option>
                            <option value="/hostdashboard/reviews">Reviews</option>
                            <option value="/hostdashboard/listings">Listing</option>
                            <option value="/hostdashboard/settings">Settings</option>
                        </select>
                    </div>

                    <div>
                        <select onChange={handleNavigation} defaultValue="Growth">
                            <option disabled>Growth</option>
                            <option value="/hostdashboard/reservations">Reservations</option>
                            <option value="/hostdashboard/revenues">Revenues</option>
                            <option value="/hostdashboard/property-care">Property Care</option>
                            <option value="/hostdashboard/iot-hub">IoT Hub</option>
                            <option value="/hostdashboard/pricing">Pricing</option>
                            <option value="/hostdashboard/distribution">Distribution</option>
                            <option value="/hostdashboard/monitoring">Monitoring</option>
                            <option value="/hostdashboard/screening">Screening</option>
                            <option value="/hostdashboard/setup">Setup</option>
                            <option value="/hostdashboard/promo-codes">Promo Codes</option>
                            <option value="stripe" onClick={() => handleStripeAction()}>
                                {stripeLoginUrl ? 'Go to Stripe Dashboard' : 'Set Up Payments'}
                            </option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PagesDropdown;