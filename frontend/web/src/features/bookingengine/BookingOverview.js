import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import CheckoutForm from "./views/CheckoutForm";
import { getAccessToken } from "../../services/getAccessToken";
import Register from "../auth/Register";
import FetchPropertyDetails from "./services/FetchPropertyDetails";
import NotFoundException from "../../utils/exception/NotFoundException";
import Unauthorized from "../../utils/exception/Unauthorized";
import spinner from "../../images/spinnner.gif";

import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import Calender from "@mui/icons-material/CalendarTodayOutlined";
import People from "@mui/icons-material/PeopleAltOutlined";
import Back from "@mui/icons-material/KeyboardBackspace";
import { create } from "@mui/material/styles/createTransitions";

const stripePromise = loadStripe(
  "pk_test_51OAG6OGiInrsWMEcRkwvuQw92Pnmjz9XIGeJf97hnA3Jk551czhUgQPoNwiCJKLnf05K6N2ZYKlXyr4p4qL8dXvk00sxduWZd3" // Change to live key in production
);

const BookingOverview = () => {
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState({ username: "", email: "", phone_number: "" });
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [cognitoUserEmail, setCognitoUserEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pricingObject, setPricingObject] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [accommodation, setAccommodation] = useState(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const propertyId = searchParams.get("id");
  const checkInDate = searchParams.get("checkInDate");
  const checkOutDate = searchParams.get("checkOutDate");
  const guests = searchParams.get("guests");
  const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
  const currentDomain = `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port}` : ""}`;

  const options = {
    mode: "payment",
    amount: 1099,
    currency: "usd",
    // Fully customizable with appearance API.
    appearance: {
      /*...*/
    },
  };
  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        const retrievedPricingObject = await FetchPropertyDetails(propertyId, checkInDate, checkOutDate);
        const retrievedBookingDetails = { accommodation: pricingObject, checkInDate, checkOutDate, guests };
        setPricingObject(retrievedPricingObject);
        setBookingDetails(retrievedBookingDetails);

        console.log("Pricing Object:", retrievedPricingObject);
        console.log("Booking Details:", retrievedBookingDetails);

        if ((!retrievedBookingDetails, !retrievedBookingDetails)) {
          // fix setloading to display error user sided
          setError("Booking details or pricing object is not available.");
          throw new NotFoundException("Booking details or pricing object is not available.");
        }
      } catch (error) {
        console.error("Error fetching accommodation data:", error);
        setError("Error fetching property data. Please try again later.");
      }
    };
    fetchAccommodation();
  }, [propertyId, checkInDate, checkOutDate, guests]);

    
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setIsLoggedIn(true);
        const userAttributes = userInfo.attributes;
        setUserData({
          username: userAttributes["custom:username"],
          email: userAttributes["email"],
          phone_number: userAttributes["phone_number"],
        });
        setCognitoUserId(userAttributes.sub);
        setCognitoUserEmail(userAttributes["email"]);
      } catch (error) {
        setIsLoggedIn(false);
        console.error("Error logging in:", error);
      }
    };
    checkAuthentication();
  }, []);

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

  if (error) {
    return <div className="error-message">{error}</div>;
  } else if (!bookingDetails || !pricingObject) {
    return <img src={spinner} className="centerObject"></img>;
  }

  const createBooking = async () => {
    const event = {
        identifiers: {
          property_Id: propertyId,
        },
        general: {
          guests: parseFloat(bookingDetails.guests),
          latePayment: false,
          arrivalDate: parseFloat(bookingDetails.checkInDate),
          departureDate: parseFloat(bookingDetails.checkOutDate),
        },
    };

    try {
      const authToken = await getAccessToken();
      if (!authToken) {
        setError("Missing authentication token. Try refreshing the page.");
        throw new Unauthorized("Unable to get a valid authentication token.");
      }

      const request = await fetch("https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings", {
        method: "POST",
        body: JSON.stringify(event),
        headers: {
          Authorization: authToken,
          "Content-type": "application/json; charset=UTF-8"
        },
      });

      console.log(request);
      const response = await request.json();
      if (!request.ok) {
        throw new error(`HTTP error! Status: ${request.status}`);
      }
      console.log(response);
    } catch (error) {
      console.error("Error creating booking:", error);
      // setError("Unable to store booking, please contact the support team or try again later.", error);
    }
  };

  const handleConfirmAndPay = () => {
    setIsProcessing(false);
    createBooking();
    //initiateStripeCheckout();
  };
  return (
    <main className="booking-container" style={{ cursor: isProcessing ? "wait" : "default" }}>
      {error && <div className="error-message">{error}</div>}
      <div className="booking-header">
        <div className="goBackButton">
          <Link to={`/listingdetails?ID=${propertyId}`}>
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
              <span className="detail-label">
                <Calender /> Date:
              </span>
              <span className="detail-value">
                {DateFormatterDD_MM_YYYY(parseFloat(bookingDetails.checkInDate))} -{" "}
                {DateFormatterDD_MM_YYYY(parseFloat(bookingDetails.checkOutDate))}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">
                <People /> Guests:
              </span>
              <span className="detail-value">{bookingDetails.guests} guests</span>
            </div>
          </div>

          {!isLoggedIn ? (
            <div>
              <h2>Please Register or Log In to Continue</h2>
              <Register />
            </div>
          ) : (
            <button
              type="submit"
              className="confirm-pay-button"
              onClick={handleConfirmAndPay}
              disabled={loading}>
              {loading ? "Loading..." : "Confirm & Pay"}
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
                src={`${S3_URL}${pricingObject.images?.[0]?.key || ""}`}
                alt="Accommodation"
              />
              <div>
                <h1 className="booking-title">{pricingObject.title}</h1>
                <span className="acco-title-span">
                  {pricingObject.city}, {pricingObject.country}
                </span>
              </div>
            </div>
            <hr />

            <div className="detail-row">
              <span className="detail-label">
                <b>Price info:</b>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">
                € {(pricingObject.roomRate || 0).toFixed(2)} x {pricingObject.differenceInDays} nights{" "}
              </span>
              <span className="detail-value">
                € {(pricingObject.roomRate * pricingObject.differenceInDays || 0).toFixed(2)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Taxes:</span>
              <span className="detail-value">€ {(0).toFixed(2)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Cleaning fee:</span>
              <span className="detail-value">€ {(pricingObject.cleaning || 0).toFixed(2)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Service fee:</span>
              <span className="detail-value">
                € {(pricingObject.roomRate || 0).toFixed(2) * 0.15} x {pricingObject.differenceInDays} nights
              </span>
              <span className="detail-value">€ {(pricingObject.roomRate * 0.15 || 0).toFixed(2)}</span>
            </div>

            <div className="detail-row total-price">
              <span className="detail-label">Total:</span>
              <span className="detail-value">€ {(pricingObject.total || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default BookingOverview;
