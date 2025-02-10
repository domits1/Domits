import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./paymentconfirmpage.css";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

const BookingConfirmationOverview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBookingDetails = async () => {
            const queryParams = new URLSearchParams(location.search);
            const paymentID = queryParams.get("paymentID");
    
            if (!paymentID) {
                console.error("Missing Payment ID in URL");
                setError("Payment ID is missing.");
                setLoading(false);
                return;
            }
    
            console.log("🔍 Extracted Payment ID:", paymentID);
    
            try {
                const response = await fetch(
                    `https://cmxggcetwh.execute-api.eu-north-1.amazonaws.com/default/Guest-Booking-Production-Read-PaymentConfirmation?paymentID=${paymentID}`
                );
    
                if (!response.ok) {
                    throw new Error(`Error fetching booking details: ${response.statusText}`);
                }
    
                const data = await response.json();
                console.log("API Response:", data);
    
                const parsedBody = data.body ? JSON.parse(data.body) : data;
    
                if (!parsedBody.bookingDetails) {
                    throw new Error("Booking details not found.");
                }
    
                setBookingDetails(parsedBody.bookingDetails);
            } catch (error) {
                console.error("❌ Fetch Error:", error);
                setError("Failed to load booking details.");
            } finally {
                setLoading(false);
            }
        };
    
        fetchBookingDetails();
    }, [location]);
    
    if (loading) return <p>Loading booking details...</p>;
    if (error) return <p>{error}</p>;

    return (
        <main className="PaymentOverview">
            <div className="right-panel">
                <h1>Booking Confirmation</h1>

                <div className="confirmInformation">
                    <div>
                        <h3>Booking Confirmed</h3>
                        <p><strong>Check-in:</strong> {bookingDetails?.StartDate}</p>
                        <p><strong>Check-out:</strong> {bookingDetails?.EndDate}</p>
                    </div>
                    <div className="right">
                        <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 50, color: "green" }} />
                    </div>
                </div>

                <div className="priceContainer">
                    <h3>Price Details</h3>
                    <p><strong>Guests:</strong> {bookingDetails?.AmountOfGuest}</p>

                    <div className="price-breakdown">
                        <div className="row">
                            <p>Price per night</p>
                            <p>€ {bookingDetails?.Price}</p>
                        </div>
                        <div className="row">
                            <p>Cleaning Fee</p>
                            <p>€ {bookingDetails?.CleaningFee}</p>
                        </div>
                        <div className="row">
                            <p>Taxes</p>
                            <p>€ {bookingDetails?.Taxes}</p>
                        </div>
                    </div>

                    <div className="total-price">
                    <strong>Total:</strong>
                    <strong>€ {(
                        (isNaN(parseFloat(bookingDetails?.Price)) ? 0 : parseFloat(bookingDetails?.Price)) +
                        (isNaN(parseFloat(bookingDetails?.CleaningFee)) ? 0 : parseFloat(bookingDetails?.CleaningFee)) +
                        (isNaN(parseFloat(bookingDetails?.Taxes)) ? 0 : parseFloat(bookingDetails?.Taxes))
                    ).toFixed(2)}</strong>
                </div>
                </div>

                <button className="view-booking-button" onClick={() => navigate("/guestdashboard/bookings")}>
                    View Booking
                </button>
            </div>
        </main>
    );
};

export default BookingConfirmationOverview;
