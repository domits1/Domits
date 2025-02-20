import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./paymentconfirmpage.css";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ImageGallery from "./ImageGallery";

const BookingConfirmationOverview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);
    const [accommodationDetails, setAccommodationDetails] = useState(null);
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


            try {
                const response = await fetch(
                    `https://cmxggcetwh.execute-api.eu-north-1.amazonaws.com/default/Guest-Booking-Production-Read-PaymentConfirmation?paymentID=${paymentID}`
                );

                if (!response.ok) {
                    throw new Error(`Error fetching booking details: ${response.statusText}`);
                }

                const data = await response.json();

                const parsedBody = data.body ? JSON.parse(data.body) : data;

                if (!parsedBody.bookingDetails) {
                    throw new Error("Booking details not found.");
                }
                setBookingDetails(parsedBody.bookingDetails);
                setAccommodationDetails(parsedBody.accommodationDetails);

            } catch (error) {
                console.error("Fetch Error:", error);
                setError("Failed to load booking details.");
            } finally {
                setLoading(false);
            }
        };

        fetchBookingDetails();
    }, [location]);

    const formatDate = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      };

      const calculateTotalPrice = (bookingDetails) => {
        const price = parseFloat(bookingDetails?.Price) || 0;
        const taxes = parseFloat(bookingDetails?.Taxes) || 0;
        const cleaningFee = parseFloat(bookingDetails?.CleaningFee) || 0;
        const serviceFee = parseFloat(bookingDetails?.ServiceFee) || 0;
    
        return price + taxes + cleaningFee + serviceFee;
    };
    

    if (loading) return <p>Loading booking details...</p>;
    if (error) return <p>{error}</p>

    return (
        <main className="PaymentOverview">
            
            <div className="left">
                    {accommodationDetails?.Images && Object.keys(accommodationDetails.Images).length > 0 ? (
                        <>
                            <ImageGallery images={Object.values(accommodationDetails.Images)} />
                        </>
                    ) : (
                        <>
                            {console.warn("No images found in accommodationDetails:", accommodationDetails)}
                            <p>No images available for this accommodation.</p>
                        </>
                    )}
                </div>

            <div className="right-panel">
                <h1>Payment Confirmation</h1>

                {bookingDetails && (
                        <h3>{bookingDetails.Title}</h3>
                )}

                <div className="confirmInformation">
                    <div>
                    <h3>
                    Booking {bookingDetails.Status === "Confirmed" ? "Confirmed" : bookingDetails.Status === "Failed" ? "Failed" : "Pending"}
                    </h3>
                        <p><strong>Check-in:</strong> {accommodationDetails?.StartDate ? new Date(accommodationDetails.StartDate).toLocaleDateString() : 'N/A'}</p>
                        <p><strong>Check-out:</strong> {accommodationDetails?.EndDate ? new Date(accommodationDetails.EndDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    
                    <div className="right">
                        <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 50, color: "green" }} />
                    </div>
                </div>

                <div className="priceContainer">
                    <h3>Price Details</h3>
                    
                    <div className="price-breakdown">            
                    <div className="row">
                            <p>Guests:</p>
                            <p>{bookingDetails?.AmountOfGuest}</p>  
                        </div>

                    <div className="row">
                    <p>Date</p>
                    <p>{formatDate(bookingDetails?.StartDate)} - {formatDate(bookingDetails?.EndDate)}</p>
                        </div>
                    </div>

                    <div className="price-breakdown">

                        <div className="row">
                            <p>Price</p>
                            <p>€ {bookingDetails?.Price}</p>
                        </div>
                        <div className="row">
                            <p>Taxes</p>
                            <p>€ {bookingDetails?.Taxes}</p>
                        </div>
                        <div className="row">
                            <p>Cleaning fee</p>
                            <p>€ {bookingDetails?.CleaningFee}</p>   
                        </div>

                        <div className="row">
                            <p>Domit service fee:</p>
                            <p>€ {bookingDetails?.ServiceFee}</p>
                        </div>
                    </div>

                    <div className="total-price">
                        <strong>Total:</strong>
                        <strong></strong>
                        <strong>€ {calculateTotalPrice(bookingDetails)}</strong>
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
