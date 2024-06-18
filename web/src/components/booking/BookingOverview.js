import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
import { FlowProvider } from '../../FlowContext';
import { loadStripe } from '@stripe/stripe-js';
import "./bookingoverview.css";
import Register from "../base/Register";
import DateFormatterDD_MM_YYYY from '../utils/DateFormatterDD_MM_YYYY';
import ImageGallery from './ImageGallery';

const stripePromise = loadStripe('pk_live_51OAG6OGiInrsWMEcQy4ohaAZyT7tEMSEs23llcw2kr2XHdAWVcB6Tm8F71wsG8rB0AHgh4SJDkyBymhi82WABR6j00zJtMkpZ1');


const BookingOverview = () => {
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState({ username: "", email: "" });
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [ownerStripeId, setOwnerStripeId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [accommodation, setAccommodation] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // New state for cursor wait
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const adults = parseInt(searchParams.get('adults'), 10);
    const kids = parseInt(searchParams.get('kids'), 10);
    const pets = searchParams.get('pets');

    const currentDomain = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;

    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ID: id })
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }
                const responseData = await response.json();
                const data = JSON.parse(responseData.body);
                setAccommodation(data);
                setBookingDetails({ accommodation: data, checkIn, checkOut, adults, kids, pets });
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };
        fetchAccommodation();
    }, [id, checkIn, checkOut, adults, kids, pets]);

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setIsLoggedIn(true);
                const userAttributes = userInfo.attributes;
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

        if (accommodation && accommodation.OwnerId) {
            fetchOwnerStripeId(accommodation.OwnerId);
        }
    }, [accommodation]);

    if (!bookingDetails || !accommodation) {
        return <div>Loading...</div>;
    }


    const calculateDaysBetweenDates = (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
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

        const paymentID = generateUUID();
        const userId = cognitoUserId;
        const accommodationTitle = accommodation.Title;
        const accommodationId = id;
        const ownerId = accommodation.OwnerId;
        const basePrice = accommodation.Rent * numberOfDays; // Base accommodation price
        const totalAmount = basePrice * 1.15; // Total amount including 15% fee
        const startDate = checkIn;
        const endDate = checkOut;

        const successQueryParams = new URLSearchParams({
            paymentID,
            accommodationTitle,
            userId,
            accommodationId,
            ownerId,
            State: "Pending",
            price: totalAmount,
            startDate,
            endDate
        }).toString();
        const cancelQueryParams = new URLSearchParams({
            paymentID,
            accommodationTitle,
            userId,
            accommodationId,
            ownerId,
            State: "Failed",
            price: totalAmount,
            startDate,
            endDate
        }).toString();

        const successUrl = `${currentDomain}/bookingconfirmation?${successQueryParams}`;
        const cancelUrl = `${currentDomain}/bookingconfirmation?${cancelQueryParams}`;

        const checkoutData = {
            userId: cognitoUserId,
            basePrice: basePrice * 100,
            totalAmount: totalAmount * 100,
            currency: 'eur',
            productName: accommodation.Title,
            successUrl: successUrl,
            cancelUrl: cancelUrl,
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
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirmAndPay = (e) => {
        e.preventDefault();
        setIsProcessing(true);
        initiateStripeCheckout();
    };

    return (
        <main className="container Bookingcontainer" style={{ cursor: isProcessing ? 'wait' : 'default' }}>
            <div className="main-content">
                <h1>{accommodation.Title}</h1>
                <p>{accommodation.Description}</p>
                <div>
                    <ImageGallery images={Object.values(accommodation.Images)} />
                </div>
                {error && <div className="error">{error}</div>}
                <div className="booking-details">
                    <div className="detail-item">
                        <span>Dates</span>
                        <span>{DateFormatterDD_MM_YYYY(checkIn)} - {DateFormatterDD_MM_YYYY(checkOut)}</span>
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
                    <p>Check-in: {DateFormatterDD_MM_YYYY(checkIn)}</p>
                    <p>Check-out: {DateFormatterDD_MM_YYYY(checkOut)}</p>
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
                            <FlowProvider>
                                <Register />
                            </FlowProvider>
                        )}
                    </form>
                </div>
            </div>
        </main>
    );
};

export default BookingOverview;