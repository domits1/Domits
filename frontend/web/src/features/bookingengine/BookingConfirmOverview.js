import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./styles/BookingConfirmOverview.scss";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ImageGallery from "./ImageGallery";
import useAddUserToContactList from "./hooks/useAddUserToContactList";
import BookingFetchData from "./services/BookingFetchData";
import Calender from '@mui/icons-material/CalendarTodayOutlined';
import People from '@mui/icons-material/PeopleAltOutlined';
import Cleaning from '@mui/icons-material/CleaningServicesOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import CalculateDaysBetweenDates from "./utils/CalculateDifferenceInNights";

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
            const paymentId = queryParams.get("paymentId");
            if (!paymentId) {
                console.error("Missing Payment ID in URL");
                setError("Payment ID is missing.");
                setLoading(false);
                return;
            }
            try {
                const data = await BookingFetchData(paymentId);
                const bookingInfo = extractBookingDetails(data.bookingData, data.accommodationData);
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
        const difference = CalculateDaysBetweenDates(bookingData.arrivaldate, bookingData.departuredate);
        const roomRate = accommodationData.pricing.roomRate * difference;
        const calculatedServiceFee = accommodationData.pricing.roomRate * 0.15;
        const totalPrice = accommodationData.pricing.roomRate * difference + accommodationData.pricing.cleaning + calculatedServiceFee;
        return {
            arrivalDate: bookingData.arrivaldate,
            departureDate: bookingData.departuredate,
            guests: bookingData.guests,
            guestId: bookingData.guestid,
            id: bookingData.property_id,
            hostId: accommodationData.property.hostId,
            status: bookingData.status,
            title: accommodationData.property.title,
            price: roomRate,
            totalPrice: totalPrice,
            tax: 0,
            cleaningFee: accommodationData.pricing.cleaning,
            serviceFee: calculatedServiceFee,
            images: accommodationData.images,
        }
    }

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
                    {bookingDetails?.images && bookingDetails.images.length > 0 ?(
                        <ImageGallery images={bookingDetails.images.map(img => `${S3_URL}${img.key}`)} />
                    ) : (
                        <p>No images available for this accommodation.</p>
                    )}
                </div>
            )}

            <div className="right-panel">
                <h1>Payment Confirmation</h1>
                {bookingDetails && <h3>{bookingDetails.title}</h3>}
                {isMobileView && (
                    <div className="left mobile-left">
                    {bookingDetails?.images && bookingDetails.images.length > 0 ?(
                        <ImageGallery images={bookingDetails.images.map(img => `${S3_URL}${img.key}`)} />
                    ) : (
                            <p>No images available for this accommodation.</p>
                        )}
                    </div>
                )}
                <div className="confirmInformation">
                    <div>
                        <h3>
                            Booking{" "}
                            {bookingDetails.status === "Paid"
                                ? "Confirmed"
                                : bookingDetails.status === "Awaiting Payment"
                                    ? "Failed"
                                    : "Pending"}
                        </h3>
                        <p>
                            <strong>Check-in:</strong>{" "}
                            {bookingDetails?.arrivalDate
                                ? new Date(Number(bookingDetails.arrivalDate)).toLocaleDateString()
                                : "N/A"}
                        </p>
                        <p>
                            <strong>Check-out:</strong>{" "}
                            {bookingDetails?.departureDate
                                ? new Date(Number(bookingDetails.departureDate)).toLocaleDateString()
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
                            
                            <p>{bookingDetails?.guests}</p>
                        </div>

                        <div className="row">
                            <p><Calender />Date</p>
                            <p>
                                {formatDate(Number(bookingDetails?.arrivalDate))} - {formatDate(Number(bookingDetails?.departureDate))}
                            </p>
                        </div>
                    </div>

                    <div className="price-breakdown">
                        <div className="row">
                            <p><AttachMoneyIcon />Price</p>
                            <p>€ {bookingDetails?.price}</p>
                        </div>
                        <div className="row">
                            <p><AttachMoneyIcon />Taxes</p>
                            <p>€ {bookingDetails?.tax}</p>
                        </div>
                        <div className="row">
                            <p><Cleaning />Cleaning fee</p>
                            <p>€ {bookingDetails?.cleaningFee}</p>
                        </div>

                        <div className="row">
                            <p><RoomServiceIcon />Domits service fee:</p>
                            <p>€ {bookingDetails?.serviceFee}</p>
                        </div>
                    </div>

                    <div className="total-price">
                        <strong>Total:</strong>
                        <strong>€ {bookingDetails?.totalPrice}</strong>
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