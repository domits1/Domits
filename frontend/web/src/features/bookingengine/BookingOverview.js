import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import SetupForm from "./views/SetupForm.js";
import { getAccessToken } from "../../services/getAccessToken";
import FetchPropertyDetails from "./services/FetchPropertyDetails";
import NotFoundException from "../../utils/exception/NotFoundException";
import Unauthorized from "../../utils/exception/Unauthorized";
import spinner from "../../images/spinnner.gif";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import Calender from "@mui/icons-material/CalendarTodayOutlined";
import People from "@mui/icons-material/PeopleAltOutlined";
import Back from "@mui/icons-material/KeyboardBackspace";
import publicKeys from "../../utils/const/publicKeys.json";

const stripePromise = loadStripe(publicKeys.STRIPE_PUBLIC_KEYS.LIVE);

const BookingOverview = () => {
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);

  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [cognitoUserEmail, setCognitoUserEmail] = useState(null);
  const [userName, setUserName] = useState(null);
  const [showCheckout, setShowCheckout] = useState(null);
  const [hideButton, setHideButton] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [pricingObject, setPricingObject] = useState(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const propertyId = searchParams.get("id");
  const checkInDate = searchParams.get("checkInDate");
  const checkOutDate = searchParams.get("checkOutDate");
  const guests = searchParams.get("guests");
  const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";

  useEffect(() => {
    const fetchAccommodation = async () => {
      try {
        if (!checkInDate || !checkOutDate || !propertyId || !guests) {
          setError("Unable to retrieve property information from the URL. Please try again later.");
          console.error("URL Query Parameters are missing from your request. Unable to load BookingOverview.");
          throw new NotFoundException("checkInDate, checkOutDate, guests, or PropertyId missing from URL.");
        }

        const retrievedPricingObject = await FetchPropertyDetails(propertyId, checkInDate, checkOutDate);
        setPricingObject(retrievedPricingObject);
        const retrievedBookingDetails = {
          accommodation: retrievedPricingObject,
          checkInDate,
          checkOutDate,
          guests,
          testStatus: Boolean(retrievedPricingObject?.testStatus),
        };
        setBookingDetails(retrievedBookingDetails);

        if (!retrievedBookingDetails) {
          setError("Booking details or pricing object is not available.");
          throw new NotFoundException("Booking details or pricing object is not available.");
        }
      } catch (error) {
        console.error("Error fetching accommodation data:", error);
        setError(
          "We couldn't load the property details. Check your internet or try again. If this continues, reach out to support."
        );
      }
    };
    fetchAccommodation();
  }, [propertyId, checkInDate, checkOutDate, guests]);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const authUser = await Auth.currentAuthenticatedUser();
        setIsAuthenticated(true);

        // Get user name from Cognito attributes (same as GuestDashboard)
        const attrs = authUser.attributes || {};
        const name = attrs.given_name ?? attrs.name ?? "";
        setUserName(name);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuthentication();
  }, [location.key, location.search]);

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
        guestName: userName,
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
        throw new Error(`HTTP error! Status: ${request.status}`);
      }

      if (response.stripeClientSecret && response.bookingId) {
        setBookingId(response.bookingId);
        setStripeClientSecret(response.stripeClientSecret);
      } else {
        console.error("Failed to save booking. Please contact support.");
        throw new NotFoundException(
          "POST request towards backend failed. Check the Network tab to debug the request. Booking process failed."
        );
      }
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

  const handleRequestInfo = () => {
    navigate(`/listingdetails?ID=${propertyId}`);
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

          {!isAuthenticated ? (
            <div>
              <h2>Please Register or Log In to Continue</h2>
              <div className="auth-actions">
                <Link to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}>
                  <button className="login-button">Login</button>
                </Link>
                <Link to={`/register?redirect=${encodeURIComponent(location.pathname + location.search)}`}>
                  <button className="register-button">Register</button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {!hideButton && !bookingDetails.testStatus && (
                <button type="submit" className="confirm-pay-button" onClick={handleConfirmAndPay} disabled={loading}>
                  {loading ? "Loading..." : "Confirm & Pay"}
                </button>
              )}
              {bookingDetails.testStatus && (
                <Link to="/contact" className="footer-links">
                  <button type="button" className="confirm-pay-button" onClick={handleRequestInfo} disabled={loading}>
                    Request Info
                  </button>
                </Link>
              )}
              {!bookingDetails.testStatus && showCheckout && stripeClientSecret && bookingId && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret: stripeClientSecret,
                    appearance: {},
                  }}>
                  <SetupForm handleConfirmAndPay={handleConfirmAndPay} bookingId={bookingId} loading />
                </Elements>
              )}
            </>
          )}
        </div>

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
              <span className="detail-label">Host price:</span>
              <span className="detail-value">
                €{" "}
                {(
                  (pricingObject.roomRate * pricingObject.differenceInDays || 0) + (pricingObject.platformFee || 0)
                ).toFixed(2)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Cleaning fee:</span>
              <span className="detail-value">
                € {pricingObject.cleaning || 0} x {pricingObject.differenceInDays} nights
              </span>
              <span className="detail-value">
                € {(pricingObject.cleaning * pricingObject.differenceInDays || 0).toFixed(2)}
              </span>
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
