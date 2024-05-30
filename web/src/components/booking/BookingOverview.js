import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import "./bookingoverview.css";
import Register from "../base/Register";

const stripePromise = loadStripe('pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4L8dXvk00sxduWZd3');

const BookingOverview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState({ username: "", email: "" });
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [ownerStripeId, setOwnerStripeId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkAuthentication = async () => {
        try {
            const session = await Auth.currentSession();
            const user = await Auth.currentAuthenticatedUser();
            setIsLoggedIn(true);
            const userAttributes = user.attributes;
            setUserData({
                username: userAttributes['custom:username'],
                email: userAttributes['email'],
            });
            setCognitoUserId(userAttributes.sub);
        } catch (error) {
            setIsLoggedIn(false);
            console.error('Error logging in:', error);
        }
    };

    useEffect(() => {
        checkAuthentication();
    }, []);

    useEffect(() => {
        const fetchOwnerStripeId = async (ownerId) => {
            try {
                const response = await fetch('https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: ownerId }),
                });
                const data = await response.json();
                setOwnerStripeId(data.accountId);
            } catch (error) {
                console.error("Error fetching owner Stripe ID:", error);
                setError("Error fetching owner Stripe ID. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        if (bookingDetails && bookingDetails.accommodation && bookingDetails.accommodation.OwnerId) {
            fetchOwnerStripeId(bookingDetails.accommodation.OwnerId);
        }
    }, [bookingDetails]);

    useEffect(() => {
        const details = location.state?.details;
        if (details) {
            setBookingDetails(details);
        } else {
            navigate('/');
        }
    }, [location, navigate]);

    if (!bookingDetails) {
        return <div>Loading...</div>;
    }

    const {
        accommodation,
        checkIn,
        checkOut,
        adults,
        kids,
        pets,
    } = bookingDetails;

    // Helper function to calculate the number of days between two dates in YYYY_MM_DD format
    const calculateDaysBetweenDates = (startDate, endDate) => {
        const start = new Date(startDate.replace(/_/g, '-'));
        const end = new Date(endDate.replace(/_/g, '-'));
        const differenceInTime = end - start;
        const differenceInDays = differenceInTime / (1000 * 3600 * 24);
        return differenceInDays;
    };

    const numberOfDays = calculateDaysBetweenDates(checkIn, checkOut);
    const accommodationPrice = accommodation.Rent * numberOfDays;

    const initiateStripeCheckout = async () => {
        if (!cognitoUserId || !ownerStripeId) {
            console.error('Cognito user ID or Owner Stripe ID is not available.');
            setError('Cognito user ID or Owner Stripe ID is not available.');
            return;
        }

        const checkoutData = {
            userId: cognitoUserId,
            amount: accommodationPrice,
            currency: 'eur',
            productName: accommodation.Title,
            successUrl: 'https://domits.com/success',
            cancelUrl: 'https://domits.com/cancel',
            connectedAccountId: ownerStripeId,
        };

        try {
            const response = await fetch('https://3zkmgnm6g6.execute-api.eu-north-1.amazonaws.com/dev/create-checkout-session', {
                method: 'POST',
                body: JSON.stringify(checkoutData),
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            const stripe = await stripePromise;
            const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId });

            if (error) {
                console.error('Stripe Checkout error:', error.message);
                setError('Stripe Checkout error: ' + error.message);
            }
        } catch (error) {
            console.error('Error initiating Stripe Checkout:', error);
            setError('Error initiating Stripe Checkout. Please try again later.');
        }
    };

    const handleConfirmAndPay = (e) => {
        e.preventDefault();
        initiateStripeCheckout();
    };

    return (
        <main className="container Bookingcontainer">
            <div className="main-content">
                <h1>{accommodation.Title}</h1>
                <p>{accommodation.Description}</p>
                {error && <div className="error">{error}</div>} {/* Display errors */}
                <div className="booking-details">
                    <div className="detail-item">
                        <span>Dates</span>
                        <span>{checkIn} - {checkOut}</span>
                        <a href="#">Change</a>
                    </div>
                    <div className="detail-item">
                        <span>Travellers</span>
                        <span>{adults} adults - {kids} kids</span>
                        <a href="#">Change</a>
                    </div>
                    <div className="detail-item">
                        <span>Extra cleaning</span>
                        <span>Select if needed</span>
                    </div>
                </div>
                <div className="booking-overview">
                    <h2>Booking overview</h2>
                    <p>Check-in: {checkIn}</p>
                    <p>Check-out: {checkOut}</p>
                </div>
                <div className="accommodation-info">
                    <h2>Accommodation</h2>
                    <form>
                        {isLoggedIn ? (
                            <>
                                <div className="helloUsername">Hello {userData.username}!</div>
                                <div className="form-group">
                                    <label htmlFor="name">Name</label>
                                    <input type="text" id="name" name="name" defaultValue={userData.username} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email address</label>
                                    <input type="text" id="email" name="email" defaultValue={userData.email} />
                                </div>
                                <button type="submit" className="confirm-pay-button" onClick={handleConfirmAndPay} disabled={loading || !ownerStripeId}>
                                    {loading ? 'Loading...' : 'Confirm & Pay'}
                                </button>
                            </>
                        ) : (
                            <>
                                <Register />
                            </>
                        )}
                    </form>
                </div>
            </div>
        </main>
    );
};

export default BookingOverview;