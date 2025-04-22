import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import { loadStripe } from '@stripe/stripe-js';
import "./styles/BookingOverview.scss";
import RegisterModule from "../auth/RegisterModule";
import DateFormatterDD_MM_YYYY from '../../utils/DateFormatterDD_MM_YYYY';
import Calender from '@mui/icons-material/CalendarTodayOutlined';
import People from '@mui/icons-material/PeopleAltOutlined';
import Cleaning from '@mui/icons-material/CleaningServicesOutlined';
import Back from '@mui/icons-material/KeyboardBackspace';

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
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [accommodation, setAccommodation] = useState(null);
    const [cleaningFee, setCleaningFee] = useState(null);
    const [roomRate, setRoomRate] = useState(null);
    const [rawRoomRate, setRawRoomRate] = useState(null);
    const [numberOfDays, setNumberOfDays] = useState(null);
    const [totalPrice, setTotalPrice] = useState(null);
    const [taxes, setTaxes] = useState(1.09)
    const [ServiceFee, setServiceFee] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const id = searchParams.get('id');
    const checkIn = searchParams.get('checkInDate');
    const checkOut = searchParams.get('checkOutDate');
    const adults = parseInt(searchParams.get('guests'), 10);
    const amountOfGuest = searchParams.get('guests');
    const kids = parseInt(searchParams.get('kids'), 10); 
    const pets = searchParams.get('pets'); 

    const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/"
    const currentDomain = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}`;
    
    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`);
                const responseData = await response.json();
                setAccommodation(responseData);

                const rawRoomRate = responseData.pricing.roomRate;
                setRawRoomRate(rawRoomRate); // Used in booking details tab
                setCleaningFee(responseData.pricing.cleaning); 
                setServiceFee(responseData.pricing.service);  

                const numberOfDays = await calculateDaysBetweenDates(checkIn, checkOut);
                setNumberOfDays(numberOfDays);
                const totalRoomRate = rawRoomRate * numberOfDays;
                setRoomRate(totalRoomRate);

                const total = totalRoomRate + responseData.pricing.cleaning + responseData.pricing.service;
                setTotalPrice(total);

                setBookingDetails({ accommodation: responseData, checkIn, checkOut, adults, kids, pets, amountOfGuest });  

            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };   

        const calculateDaysBetweenDates = async (startDate, endDate) => {
            const start = new Date(parseFloat(startDate));
            const end = new Date(parseFloat(endDate));
            const differenceInTime = end - start;
            const differenceInDays = differenceInTime / (1000 * 3600 * 24);
            return differenceInDays;
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

        if (accommodation && accommodation.property.hostId) {
            fetchOwnerStripeId(accommodation.property.hostId);
        }
    }, [accommodation]);

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const user = await Auth.currentAuthenticatedUser();
                setIsAuthenticated(true);
            } catch {
                setIsAuthenticated(false);
            }
        };
        checkAuthentication();
    }, []);

    if (!bookingDetails || !accommodation) {
        return <div>Loading...</div>;
    }

    const initiateStripeCheckout = async () => {
        if (!cognitoUserId || !ownerStripeId) {
            console.error('Cognito user ID or Owner Stripe ID is not available.');
            setError('Cognito user ID or Owner Stripe ID is not available.');
            return;
        }

        const paymentID = generateUUID();
        const userId = cognitoUserId;
        const accommodationTitle = accommodation.property.title;
        const accommodationId = id;
        const ownerId = accommodation.property.hostId;
        const basePrice = 0;
        const totalAmount = 0;
        const startDate = checkIn;
        const endDate = checkOut;

        const successQueryParams = new URLSearchParams({
            paymentID,
            accommodationTitle,
            userId,
            accommodationId,
            ownerId,
            State: "Accepted",
            price: totalAmount,
            startDate,
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes,
            ServiceFee
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
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes,
            ServiceFee
        }).toString();

        const successUrl = `${currentDomain}/bookingsend?${successQueryParams}`;
        const cancelUrl = `${currentDomain}/bookingsend?${cancelQueryParams}`;

        const checkoutData = {
            userId: cognitoUserId,
            basePrice: basePrice,
            totalAmount: totalAmount,
            currency: 'eur',
            productName: accommodation.property.title,
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
        <main className="booking-container" style={{ cursor: isProcessing ? 'wait' : 'default' }}>
        <div className="booking-header">
            <div className="goBackButton">
                <Link to={`/listingdetails?ID=${id}`}>
                    <Back />
                </Link>
            </div>
            <h1>Booking Overview</h1>
        </div>
        
        <div className="Bookingcontainer">
            {/* Right Panel */}
            <div className="right-panel">
                <div>Your Journey</div>
                <div className="booking-details">
                    <div className="detail-row">
                        <span className="detail-label"><Calender /> Date:</span>
                        <span className="detail-value">
                            {DateFormatterDD_MM_YYYY(parseFloat(checkIn))} - {DateFormatterDD_MM_YYYY(parseFloat(checkOut))}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><People /> Guests:</span>
                        <span className="detail-value">{adults} guests</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><Cleaning /> Cleaning Fee:</span>
                        <span className="detail-value">€ {(cleaningFee).toFixed(2)}</span>
                    </div>
                </div>

                {!isLoggedIn ? (
                    <div>
                        <h2>Please Register or Log In to Continue</h2>
                        <RegisterModule />
                    </div>
                ) : (
                    <button
                        type="submit"
                        className="confirm-pay-button"
                        onClick={handleConfirmAndPay}
                        disabled={loading || !ownerStripeId}>
                        {loading ? 'Loading...' : 'Confirm & Pay'}
                    </button>
                )}
            </div>

            {/* Left Panel */}
            <div className="booking-details-container">
                <div className="booking-header1">Booking Details</div>
                <div className="left-panel">
                    <div className="booking-details-name">
                        <img
                            className="bookingDetailsImage"
                            src={`${S3_URL}${accommodation.images?.[0]?.key || ''}`} 
                            alt="Accommodation"
                        />
                        <div>
                            <h1 className="booking-title">{accommodation.property.title}</h1>
                            <span className="acco-title-span">{accommodation.location.city}, {accommodation.location.country}</span>
                        </div>
                    </div>
                    <hr />

                    <div className="detail-row">
                        <span className="detail-label"><b>Price info:</b></span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">€ {(rawRoomRate || 0).toFixed(2)} x {numberOfDays} nights </span>
                        <span className="detail-value">€ {(roomRate || 0).toFixed(2)}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Taxes:</span>
                        <span className="detail-value">€ {(0).toFixed(2)}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Cleaning fee:</span>
                        <span className="detail-value">€ {(cleaningFee || 0).toFixed(2)}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">Service fee:</span>
                        <span className="detail-value">€ {(ServiceFee || 0).toFixed(2)}</span>
                    </div>

                    <div className="detail-row total-price">
                        <span className="detail-label">Total:</span>
                        <span className="detail-value">
                            € {(totalPrice || 0).toFixed(2)}
                        </span>
                    </div>
                </div>  
            </div>
        </div>
    </main>



    );
};

export default BookingOverview  ;
