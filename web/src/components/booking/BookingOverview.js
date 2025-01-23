import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import {Link, useNavigate} from 'react-router-dom';
import { FlowProvider } from '../../FlowContext';
import { loadStripe } from '@stripe/stripe-js';
import "./bookingoverview.css";
import Register from "../base/Register";
import DateFormatterDD_MM_YYYY from '../utils/DateFormatterDD_MM_YYYY';
// import ImageGallery from './ImageGallery';
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
    const [formData, setFormData] = useState({ countryCode: "+1", phoneNumber: "" }); // Add formData state
    const [userData, setUserData] = useState({ username: "", email: "", phone_number: "" });
    const [cognitoUserId, setCognitoUserId] = useState(null);
    const [ownerStripeId, setOwnerStripeId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

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
    const serviceFee = parseFloat(searchParams.get('serviceFee')) * 100;


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

    const handleCountryCodeChange = (e) => {
        setFormData(prevState => ({
            ...prevState,
            countryCode: e.target.value,
        }));
    };

    const countryCodes = [
        { code: "+1", name: "United States/Canada" },
        { code: "+7", name: "Russia" },
        { code: "+20", name: "Egypt" },
        { code: "+27", name: "South Africa" },
        { code: "+30", name: "Greece" },
        { code: "+31", name: "Netherlands" },
        { code: "+32", name: "Belgium" },
        { code: "+33", name: "France" },
        { code: "+34", name: "Spain" },
        { code: "+36", name: "Hungary" },
        { code: "+39", name: "Italy" },
        { code: "+40", name: "Romania" },
        { code: "+44", name: "United Kingdom" },
        { code: "+45", name: "Denmark" },
        { code: "+46", name: "Sweden" },
        { code: "+47", name: "Norway" },
        { code: "+48", name: "Poland" },
        { code: "+49", name: "Germany" },
        { code: "+52", name: "Mexico" },
        { code: "+54", name: "Argentina" },
        { code: "+55", name: "Brazil" },
        { code: "+56", name: "Chile" },
        { code: "+57", name: "Colombia" },
        { code: "+58", name: "Venezuela" },
        { code: "+60", name: "Malaysia" },
        { code: "+61", name: "Australia" },
        { code: "+62", name: "Indonesia" },
        { code: "+63", name: "Philippines" },
        { code: "+64", name: "New Zealand" },
        { code: "+65", name: "Singapore" },
        { code: "+66", name: "Thailand" },
        { code: "+81", name: "Japan" },
        { code: "+82", name: "South Korea" },
        { code: "+84", name: "Vietnam" },
        { code: "+86", name: "China" },
        { code: "+90", name: "Turkey" },
        { code: "+91", name: "India" },
        { code: "+92", name: "Pakistan" },
        { code: "+93", name: "Afghanistan" },
        { code: "+94", name: "Sri Lanka" },
        { code: "+95", name: "Myanmar" },
        { code: "+98", name: "Iran" },
        { code: "+212", name: "Morocco" },
        { code: "+213", name: "Algeria" },
        { code: "+216", name: "Tunisia" },
        { code: "+218", name: "Libya" },
        { code: "+220", name: "Gambia" },
        { code: "+221", name: "Senegal" },
        { code: "+223", name: "Mali" },
        { code: "+225", name: "Ivory Coast" },
        { code: "+230", name: "Mauritius" },
        { code: "+234", name: "Nigeria" },
        { code: "+254", name: "Kenya" },
        { code: "+255", name: "Tanzania" },
        { code: "+256", name: "Uganda" },
        { code: "+260", name: "Zambia" },
        { code: "+263", name: "Zimbabwe" },
        { code: "+267", name: "Botswana" },
        { code: "+356", name: "Malta" },
        { code: "+358", name: "Finland" },
        { code: "+359", name: "Bulgaria" },
        { code: "+370", name: "Lithuania" },
        { code: "+371", name: "Latvia" },
        { code: "+372", name: "Estonia" },
        { code: "+373", name: "Moldova" },
        { code: "+374", name: "Armenia" },
        { code: "+375", name: "Belarus" },
        { code: "+376", name: "Andorra" },
        { code: "+380", name: "Ukraine" },
        { code: "+381", name: "Serbia" },
        { code: "+385", name: "Croatia" },
        { code: "+386", name: "Slovenia" },
        { code: "+387", name: "Bosnia and Herzegovina" },
        { code: "+389", name: "North Macedonia" },
        { code: "+420", name: "Czech Republic" },
        { code: "+421", name: "Slovakia" },
        { code: "+423", name: "Liechtenstein" },
        { code: "+500", name: "Falkland Islands" },
        { code: "+501", name: "Belize" },
        { code: "+502", name: "Guatemala" },
        { code: "+503", name: "El Salvador" },
        { code: "+504", name: "Honduras" },
        { code: "+505", name: "Nicaragua" },
        { code: "+506", name: "Costa Rica" },
        { code: "+507", name: "Panama" },
        { code: "+509", name: "Haiti" },
        { code: "+852", name: "Hong Kong" },
        { code: "+853", name: "Macau" },
        { code: "+855", name: "Cambodia" },
        { code: "+856", name: "Laos" },
        { code: "+880", name: "Bangladesh" },
        { code: "+960", name: "Maldives" },
        { code: "+961", name: "Lebanon" },
        { code: "+962", name: "Jordan" },
        { code: "+963", name: "Syria" },
        { code: "+964", name: "Iraq" },
        { code: "+965", name: "Kuwait" },
        { code: "+966", name: "Saudi Arabia" },
        { code: "+967", name: "Yemen" },
        { code: "+971", name: "United Arab Emirates" },
        { code: "+972", name: "Israel" },
        { code: "+973", name: "Bahrain" },
        { code: "+974", name: "Qatar" },
        { code: "+975", name: "Bhutan" },
        { code: "+976", name: "Mongolia" },
        { code: "+977", name: "Nepal" },
        { code: "+992", name: "Tajikistan" },
        { code: "+993", name: "Turkmenistan" },
        { code: "+994", name: "Azerbaijan" },
        { code: "+995", name: "Georgia" },
        { code: "+996", name: "Kyrgyzstan" },
        { code: "+998", name: "Uzbekistan" },
    ];

    return (
        <main className="booking-container" style={{ cursor: isProcessing ? 'wait' : 'default' }}>
        <div className="booking-header">

        <div className="goBackButton">
                    <Link to={`/listingdetails?ID=${accommodation.ID}`}>
                        {/* <p className="backButton">Go Back</p> */}
                        <Back />
                    </Link>
                </div>
            <h1>Booking Overview</h1>
        </div>
    
        <div className="Bookingcontainer">
            {/* Right Panel */}
            <div className="right-panel">
            <div>Your journey </div>
                <div className="booking-details">
                    <div className="detail-row">
                        <span className="detail-label"><Calender /> Date:</span>
                        <span className="detail-value">
                            {DateFormatterDD_MM_YYYY(checkIn)} - {DateFormatterDD_MM_YYYY(checkOut)}
                        </span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><People /> Guests:</span>
                        <span className="detail-value">{adults} adults - {kids} kids</span>
                    </div>
                    <div className="detail-row">
                        <span className="detail-label"><Cleaning /> Cleaning Fee:</span>
                        <span className="detail-value">€ {(cleaningFee / 100).toFixed(2)}</span>
                    </div>
                </div>





                <div className="login-reserve-form">
                    <h2 className="form-title">Log in or sign up to reserve</h2>
                    <div className="form-group">
                        <label className="form-label">Country/region</label>
                        <div className="dropdown-wrapper">
                        <select className="country-dropdown"
                                name="countryCode"
                                value={formData.countryCode}
                                onChange={handleCountryCodeChange}
                            >
                                {countryCodes.map((country, index) => (
                                    <option key={index} value={country.code}>
                                        {country.name} ({country.code})
                                    </option>
                                ))}
                            </select>
                        <span className="dropdown-icon">▼</span>
                        </div>
                    </div>
                    <div className="form-group">
                        <input
                        type="text"
                        className="phone-input"
                        placeholder="Phone number"
                        />
                    </div>
                </div>
    
                <button
                    type="submit"
                    className="confirm-pay-button"
                    onClick={handleConfirmAndPay}
                    disabled={loading || !ownerStripeId}
                >
                    {loading ? 'Loading...' : 'Confirm & Pay'}
                </button>

                
                {/* <div>or</div> */}

            </div>

            <div className="booking-details-container">
            <div className="booking-header1">Booking Details</div>
                <div className="left-panel">

                    <div className="booking-details-name">
                    <img
                        className="bookingDetailsImage"
                        src={Object.values(accommodation.Images)[0]}
                        alt="Accommodation"
                    />
                    <div>
                        <h1 className="booking-title">{accommodation.Title}</h1>
                        <span className="acco-title-span">{accommodation.City}, {accommodation.Country}</span>
                    </div>
                    </div>
                    <hr/>

                    <div className="detail-row">
                    <span className="detail-label">Cleaning Fee:</span>
                    <span className="detail-value">€ {(cleaningFee / 100).toFixed(2)}</span>
                    </div>
                    <div className="detail-row">
                    <span className="detail-label">Taxes:</span>
                    <span className="detail-value">€ {(taxes / 100).toFixed(2)}</span>
                    </div>
                    <div className="detail-row">
                    <span className="detail-label">Service Fee:</span>
                    <span className="detail-value">€ {(serviceFee / 100).toFixed(2)}</span>
                    </div>
                    <div className="detail-row total-price">
                    <span className="detail-label">Total:</span>
                    <span className="detail-value">
                        € {(accommodationPrice / 100 + cleaningFee / 100 + taxes / 100 + serviceFee / 100).toFixed(2)}
                    </span>
                    </div>
                </div>
                </div>
        </div>
    </main>
    


    );


};

export default BookingOverview;
