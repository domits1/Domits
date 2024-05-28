import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "./bookingoverview.css";

const BookingOverview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);

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
        userInfo
    } = bookingDetails;

    const handleConfirmAndPay = () => {
        // Handle payment logic here
        console.log("Payment confirmed");
    };

    const images = Object.values(accommodation.Images);

    return (
        <main className="container Bookingcontainer">
            <div className="imagebar">
                <div className="thumbnail-images">
                    {images.map((image, index) => (
                        <img key={index} src={image} alt={`Accommodation image ${index + 1}`} />
                    ))}
                </div>
            </div>
            <div className="main-content">
                <div className="steps">
                    <div className="step completed"></div>
                    <div className="step"></div>
                    <div className="step"></div>
                </div>
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
                    <p>Main booker: {userInfo.name}</p>
                    <p>Amount of travellers: {adults} adults - {kids} kids</p>
                    <p>Email address: {userInfo.email}</p>
                    <p>Phone number: {userInfo.phoneNumber}</p>
                </div>
                <div className="accommodation-info">
                    <h2>Accommodation</h2>
                    <form>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input type="text" id="name" name="name" defaultValue={userInfo.name} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="address">Address</label>
                            <input type="text" id="address" name="address" defaultValue={userInfo.address} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="postcode">Postcode</label>
                            <input type="text" id="postcode" name="postcode" defaultValue={userInfo.postcode} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="country">Country</label>
                            <input type="text" id="country" name="country" defaultValue={userInfo.country} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="phone">Phone Number</label>
                            <input type="text" id="phone" name="phone" defaultValue={userInfo.phoneNumber} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="dob">Date of Birth</label>
                            <input type="text" id="dob" name="dob" defaultValue={userInfo.dateOfBirth} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input type="password" id="password" name="password" placeholder="********************" />
                        </div>
                        <div className="form-group">
                            <input type="checkbox" id="accommodation-rules" name="accommodation-rules" />
                            <label htmlFor="accommodation-rules">I have read and accept the accommodation rules</label>
                        </div>
                        <div className="form-group">
                            <input type="checkbox" id="privacy-agreement" name="privacy-agreement" />
                            <label htmlFor="privacy-agreement">I have read and accept the privacy agreement and terms and conditions</label>
                        </div>
                        <button type="submit" className="confirm-pay-button" onClick={handleConfirmAndPay}>Confirm & Pay</button>
                    </form>
                </div>
            </div>
        </main>
    );
}

export default BookingOverview;
