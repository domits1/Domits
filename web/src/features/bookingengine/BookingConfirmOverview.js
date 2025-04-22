import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./styles/BookingConfirmOverview.scss";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ImageGallery from "./ImageGallery";
import useAddUserToContactList from "./hooks/useAddUserToContactList";

import Calender from '@mui/icons-material/CalendarTodayOutlined';
import People from '@mui/icons-material/PeopleAltOutlined';
import Cleaning from '@mui/icons-material/CleaningServicesOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RoomServiceIcon from '@mui/icons-material/RoomService';

const BookingConfirmationOverview = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [bookingDetails, setBookingDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { success, addUserToContactList } = useAddUserToContactList();
    const [contactAdded, setContactAdded] = useState(false);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768); // State to track screen size

    const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/"

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 768); // Update state on screen resize
        };

        window.addEventListener("resize", handleResize); // Add event listener for window resize
        return () => window.removeEventListener("resize", handleResize); // Cleanup event listener
    }, []);

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
                // Get property_id from paymentID
                const response = await fetch(
                    `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=paymentId&paymentID=${paymentID}`
                );

                if (!response.ok) {
                    throw new Error(`Error fetching booking details: ${response.statusText}`);
                }
                const data = await response.json();

                const parsedData = data.body ? JSON.parse(data.body) : data;
                const bookingData = parsedData.response.response[0];

                const id = bookingData.property_id.S;
                console.log(id);

                // get accommodationdata from accommodationID
                const accommodationId = await fetch(
                    `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`
                );

                if (!accommodationId.ok) {
                    throw new Error(`Error fetching booking details: ${response.statusText}`);
                }
                const accommodationData = await accommodationId.json();

                console.log(accommodationData)
                console.log(bookingData)

                if (!bookingData) {
                    throw new Error("Booking details not found.");
                }

                const bookingInfo = extractBookingDetails(bookingData, accommodationData);

                console.log("Booking details are: ", bookingInfo);

                setBookingDetails(bookingInfo);
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

    const extractBookingDetails = (bookingData, accommodationData) => {
        return {
            StartDate: bookingData.arrivalDate.N,
            EndDate: bookingData.departureDate.N,
            Guests: bookingData.guests.N,
            GuestID: bookingData.guestId.S,
            AccoID: bookingData.property_id.S,
            HostID: accommodationData.property.hostId,
            Status: bookingData.status.S,
            Title: accommodationData.property.title,
            Price: accommodationData.pricing.roomRate,
            Taxes: 0,
            CleaningFee: accommodationData.pricing.cleaning,
            ServiceFee: accommodationData.pricing.service,
            Images: accommodationData.images,
        }
    }

    const calculateTotalPrice = (bookingDetails) => {
        const price = parseFloat(bookingDetails?.Price) || 0;
        const taxes = parseFloat(bookingDetails?.Taxes) || 0;
        const cleaningFee = parseFloat(bookingDetails?.CleaningFee) || 0;
        const serviceFee = parseFloat(bookingDetails?.ServiceFee) || 0;

        return price + taxes + cleaningFee + serviceFee;
    };
    useEffect(() => {
        if (
            bookingDetails?.HostID &&
            bookingDetails?.GuestID &&
            bookingDetails?.AccoID &&
            bookingDetails.Status === "Accepted" &&
            !contactAdded
        ) {
            
            addUserToContactList(
                bookingDetails.GuestID,
                bookingDetails.HostID,
                "accepted",
                bookingDetails.AccoID
            );
            setContactAdded(true);
        }
    }, [bookingDetails]);
    

    if (loading) return <p>Loading booking details...</p>;
    if (error) return <p>{error}</p>;

    return (
        <main className="PaymentOverview">
            {/* Conditionally render the left element */}
            {!isMobileView && (
                <div className="left">
                    {bookingDetails?.Images && bookingDetails.Images.length > 0 ?(
                        <ImageGallery images={bookingDetails.Images.map(img => `${S3_URL}${img.key}`)} />
                    ) : (
                        <p>No images available for this accommodation.</p>
                    )}
                </div>
            )}

            <div className="right-panel">
                <h1>Payment Confirmation</h1>
                {bookingDetails && <h3>{bookingDetails.Title}</h3>}
                {isMobileView && (
                    <div className="left mobile-left">
                    {bookingDetails?.Images && bookingDetails.Images.length > 0 ?(
                        <ImageGallery images={bookingDetails.Images.map(img => `${S3_URL}${img.key}`)} />
                    ) : (
                            <p>No images available for this accommodation.</p>
                        )}
                    </div>
                )}
                <div className="confirmInformation">
                    <div>
                        <h3>
                            Booking{" "}
                            {bookingDetails.Status === "Accepted"
                                ? "Confirmed"
                                : bookingDetails.Status === "Failed"
                                    ? "Failed"
                                    : "Pending"}
                        </h3>
                        <p>
                            <strong>Check-in:</strong>{" "}
                            {bookingDetails?.StartDate
                                ? new Date(Number(bookingDetails.StartDate)).toLocaleDateString()
                                : "N/A"}
                        </p>
                        <p>
                            <strong>Check-out:</strong>{" "}
                            {bookingDetails?.EndDate
                                ? new Date(Number(bookingDetails.EndDate)).toLocaleDateString()
                                : "N/A"}
                        </p>
                    </div>

                    <div className="right">
                        <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 50, color: "green" }} />
                    </div>
                </div>
                <div className="priceContainer">
                    <h3>Price Details</h3>

                    <div className="price-breakdown">
                        <div className="row">
                            <p><People />Guests:</p>
                            
                            <p>{bookingDetails?.Guests}</p>
                        </div>

                        <div className="row">
                            <p><Calender />Date</p>
                            <p>
                                {formatDate(Number(bookingDetails?.StartDate))} - {formatDate(Number(bookingDetails?.EndDate))}
                            </p>
                        </div>
                    </div>

                    <div className="price-breakdown">
                        <div className="row">
                            <p><AttachMoneyIcon />Price</p>
                            <p>€ {bookingDetails?.Price}</p>
                        </div>
                        <div className="row">
                            <p><AttachMoneyIcon />Taxes</p>
                            <p>€ {bookingDetails?.Taxes}</p>
                        </div>
                        <div className="row">
                            <p><Cleaning />Cleaning fee</p>
                            <p>€ {bookingDetails?.CleaningFee}</p>
                        </div>

                        <div className="row">
                            <p><RoomServiceIcon />Domits service fee:</p>
                            <p>€ {bookingDetails?.ServiceFee}</p>
                        </div>
                    </div>

                    <div className="total-price">
                        <strong>Total:</strong>
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