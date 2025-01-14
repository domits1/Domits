import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import {Link, useNavigate} from 'react-router-dom';
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
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState({ username: "", email: "", phone_number: "" });
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [ownerStripeId, setOwnerStripeId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false); // New state for edit mode

    const [accommodation, setAccommodation] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const adults = parseInt(searchParams.get('adults'), 10);
    const kids = parseInt(searchParams.get('kids'), 10);
    const pets = searchParams.get('pets');
    const cleaningFee = parseFloat(searchParams.get('cleaningFee')) * 100;
    const amountOfGuest = searchParams.get('amountOfGuest');
    const taxes = parseFloat(searchParams.get('taxes')) * 100;


    const currentDomain = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;

    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
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
                setBookingDetails({ accommodation: data, checkIn, checkOut, adults, kids, pets, amountOfGuest });
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
                    phone_number: userAttributes['phone_number'],
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
                const response = await fetch('https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: ownerId }),
                });
                const data = await response.json();
                const parsedBody = JSON.parse(data.body);

                setOwnerStripeId(parsedBody.accountId);
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

    const handleEditClick = () => {
        setEditMode(!editMode);
    };

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
        const basePrice = Math.round(accommodation.Rent * numberOfDays * 100);
        const totalAmount = Math.round(basePrice * 1.15 + cleaningFee + taxes);
        const startDate = checkIn;
        const endDate = checkOut;

        const successQueryParams = new URLSearchParams({
            paymentID,
            accommodationTitle,
            userId,
            accommodationId,
            ownerId,
            State: "Accepted",
            price: totalAmount / 100,
            startDate,
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes
        }).toString();
        const cancelQueryParams = new URLSearchParams({
            paymentID,
            accommodationTitle,
            userId,
            accommodationId,
            ownerId,
            State: "Failed",
            price: totalAmount / 100,
            startDate,
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes
        }).toString();

        const successUrl = `${currentDomain}/bookingconfirmation?${successQueryParams}`;
        const cancelUrl = `${currentDomain}/bookingconfirmation?${cancelQueryParams}`;

        const checkoutData = {
            userId: cognitoUserId,
            basePrice: basePrice,
            totalAmount: totalAmount,
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
            <main style={{ cursor: isProcessing ? 'wait' : 'default' }}>
                <div className="progress-bar-container">
                        <div className="circle completed">
                            <span className="number-complete">1</span>
                        </div>
                        <div className="line completed"></div>
                        <div className="circle half-completed">
                            <span className="number">2</span>
                        </div>
                        <div className="line"></div>
                        <div className="circle">
                            <span className="number">3</span>
                        </div>
                    </div>
                <div className="Bookingcontainer">
                {/* Left Panel: Image and Cards */}
                    <div>
                        <Link to={`/listingdetails?ID=${accommodation.ID}`}>
                            <p className="backButton">Go Back</p>
                        </Link>
                    </div>
                    <div className="left-panel">
                        <ImageGallery images={Object.values(accommodation.Images)}/>

                    {/* Card Container under Image */}
                    <div className="card-container">
                        <div className="card">
                            <h3>Guest</h3>
                            <p>{adults} adults - {kids} kids</p>
                        </div>
                        <div className="card">
                            <h3>Extra Cleaning</h3>
                            <p>{pets ? "Selected" : "Not selected"}</p>
                        </div>
                        <div className="card">
                            <h3>Dates</h3>
                            <p>{DateFormatterDD_MM_YYYY(checkIn)} - {DateFormatterDD_MM_YYYY(checkOut)}</p>
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="right-panel">
                    <h1>{accommodation.Title}</h1>
                    <span className="acco-title-span">{accommodation.City}, {accommodation.Country}</span>
                    <div className="main-card">
                        <h2>Booking Details </h2>

                        {/* Editable Fields */}
                        <div className="detail-row">
                            <span className="detail-label">Main Booker:</span>
                            {editMode ? (
                                <input className="text-field" type="text" defaultValue={userData.username} />
                            ) : (
                                <span className="detail-value">{userData.username || "Name missing"}</span>
                            )}
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Amount of Guests:</span>
                            {editMode ? (
                                <input className="text-field" type="text" defaultValue={`${adults} adults - ${kids} kids`} />
                            ) : (
                                <span className="detail-value">{adults} adults - {kids} kids</span>
                            )}
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Email Address:</span>
                            {editMode ? (
                                <input className="text-field" type="text" defaultValue={userData.email} />
                            ) : (
                                <span className="detail-value">{userData.email || "Email missing"}</span>
                            )}
                        </div>
                        <div className="detail-row">
                            <span className="detail-label">Phone Number:</span>
                            {editMode ? (
                                <input className="text-field" type="text" defaultValue={userData.phone_number} />
                            ) : (
                                <span className="detail-value">{userData.phone_number || "Phone number missing"}</span>
                            )}
                        </div>
                        <span onClick={handleEditClick} style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}>Change</span>

                        <div className="checkbox-container">
                            <label>
                                <input type="checkbox" />
                                I have read and accept the <a href="#" style={{ color: 'green' }}>accommodation rules</a>
                            </label>
                            <label>
                                <input type="checkbox" />
                                I have read and accept the <a href="#" style={{ color: 'green' }}>privacy agreement and terms and conditions</a>
                            </label>
                        </div>

                        <button type="submit" className="confirm-pay-button" onClick={handleConfirmAndPay} disabled={loading || !ownerStripeId}>
                            {loading ? 'Loading...' : 'Confirm & Pay'}
                        </button>
                    </div>



                </div>
                </div>
            </main>
    );

};

export default BookingOverview;
