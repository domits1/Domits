import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import SetupForm from "./views/SetupForm.js";
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
  const [showCheckout, setShowCheckout] = useState(null);
  const [hideButton, setHideButton] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pricingObject, setPricingObject] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [accommodation, setAccommodation] = useState(null);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const propertyId = searchParams.get("id");
  const checkInDate = searchParams.get("checkInDate");
  const checkOutDate = searchParams.get("checkOutDate");
  const guests = searchParams.get("guests");
  const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
  const options = {
  clientSecret: stripeClientSecret,
  appearance: {
    colorBackground: '#4caf50',
    fontFamily: "Font Awesome 6 Free"
  },
};

  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        if(!checkInDate && !checkOutDate && !propertyId && !guests ){
          setError("Unable to retrieve property information from the URL. Please try again later.")
          console.error("URL Query Parameters are missing from your request. Unable to load BookingOverview.")
          throw new NotFoundException("checkInDate, checkOutDate, guests, or PropertyId missing from URL.");
        }

        const retrievedPricingObject = await FetchPropertyDetails(propertyId, checkInDate, checkOutDate);
        setPricingObject(retrievedPricingObject);
        const retrievedBookingDetails = { accommodation: retrievedPricingObject, checkInDate, checkOutDate, guests };
        setBookingDetails(retrievedBookingDetails);

        console.log("Pricing Object:", retrievedPricingObject);
        console.log("Booking Details:", retrievedBookingDetails);

        if (!retrievedBookingDetails) {
          // fix setloading to display error user sided
          setError("Booking details or pricing object is not available.");
          throw new NotFoundException("Booking details or pricing object is not available.");
        }
      } catch (error) {
        console.error("Error fetching accommodation data:", error);
        setError("We couldn't load the property details. Check your internet or try again. If this continues, reach out to support.");
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
    return <img src={spinner} alt="Loading circle spinner" className="centerObject"></img>;
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
          "Content-type": "application/json; charset=UTF-8",
        },
      });
      const response = await request.json();
      if (!request.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const retrievedStripeClientSecret = response.stripeClientSecret;

      if(response.stripeClientSecret) {
        setStripeClientSecret(response.stripeClientSecret);
      } else {
        console.error("Unable to get user's stripe client secret.");
        throw new Error("stripeClientSecret is undefined or null.");
      }
      console.log(retrievedStripeClientSecret);
      setShowCheckout(true);
    } catch (error) {
      console.error("Error creating booking:", error);
      setError("Unable to store booking, please contact the support team or try again later.", error);
    }
  };

  const handleConfirmAndPay = async () => {
    try {
      setIsProcessing(true);
      setLoading(true);
      await createBooking();
      setHideButton(true);
    } catch (error) {
      setLoading(false);
      setError("Failed to initialize checkout page. Contact support or try again.", error);
      console.error("Something went wrong during handling the confirm and pay button.", error);
    }
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
            <>
            {!hideButton && (
              <button type="submit" className="confirm-pay-button" onClick={handleConfirmAndPay} disabled={loading}>
                {loading ? "Loading..." : "Confirm & Pay"}
              </button>
            )}
              {showCheckout && stripeClientSecret && (
                <Elements stripe={stripePromise} options={options}>
                  <SetupForm handleConfirmAndPay={handleConfirmAndPay} loading />
                </Elements>
              )}
            </>
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
