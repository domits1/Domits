import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useLocation, useNavigate } from 'react-router-dom';
import { FlowProvider } from '../../FlowContext';
import "./bookingoverview.css";
import Register from "../base/Register";



const BookingOverview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState({
        username: "",
        email: "",
        phoneNumber: "",
        address: "",
        dob: "",
    });

    const checkAuthentication = async () => {
        try {
            const session = await Auth.currentSession();
            const user = await Auth.currentAuthenticatedUser();
            setIsLoggedIn(true);
            const userAttributes = user.attributes;
            setUserData((prevData) => ({
                ...prevData,
                username: userAttributes['custom:username'],
                email: userAttributes['email'],
            }));
        } catch (error) {
            setIsLoggedIn(false);
            console.error('Error logging in:', error);
        }
    };
    useEffect(() => {
        checkAuthentication();
    }, []);


    useEffect(() => {
        const details = location.state?.details;
        if (details && !bookingDetails) { // Check if details exist and bookingDetails is not already set
            setBookingDetails(details);
        } else if (!details && bookingDetails) { // Check if details are empty and bookingDetails is set
            setBookingDetails(null);
        }
    }, [location.state?.details, bookingDetails]); // Add bookingDetails to the dependency array
    

    if (!bookingDetails) {
        return <div>Loading...</div>;
    }

    const {
        accommodation,
        checkIn,
        checkOut,
        adults,
        kids,
        pets
    } = bookingDetails;

    const handleConfirmAndPay = () => {
        // Handle payment logic here
        console.log("Payment confirmed");
    };

    return (
        <main className="container Bookingcontainer">
            <div className="main-content">
                <h1>{accommodation.Title}</h1>
                <p>{accommodation.Description}</p>
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

                                <button type="submit" className="confirm-pay-button" onClick={handleConfirmAndPay}>Confirm & Pay</button>
                            </>
                        ) : (
                            <>
                                <FlowProvider>
                                    <Register />
                                </FlowProvider>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </main>
    );
}

export default BookingOverview;
