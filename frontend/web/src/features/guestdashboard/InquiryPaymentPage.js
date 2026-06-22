import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { getAccessToken } from "../../services/getAccessToken";
import SetupForm from "../bookingengine/views/SetupForm";
import publicKeys from "../../utils/const/publicKeys.json";
import spinner from "../../images/spinnner.gif";

const stripePromise = loadStripe(publicKeys.STRIPE_PUBLIC_KEYS.LIVE);
const BOOKINGS_API = "https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings";
const PAY_ROUTE_PREFIX = "/guestdashboard/pay/";

const InquiryPaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const bookingId = useMemo(() => {
    if (!location.pathname.startsWith(PAY_ROUTE_PREFIX)) return null;
    return decodeURIComponent(location.pathname.slice(PAY_ROUTE_PREFIX.length));
  }, [location.pathname]);

  useEffect(() => {
    if (!bookingId) {
      setError("Invalid booking ID.");
      setLoading(false);
      return;
    }

    const fetchClientSecret = async () => {
      try {
        const authToken = getAccessToken();
        const url = `${BOOKINGS_API}?readType=getPayment&bookingId=${encodeURIComponent(bookingId)}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: authToken },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const secret = data?.response ?? data?.stripeClientSecret;
        if (!secret) throw new Error("No client secret returned.");
        setStripeClientSecret(secret);
      } catch (err) {
        console.error("Failed to fetch Stripe client secret:", err);
        setError("Failed to load payment. Please try again or contact support.");
      } finally {
        setLoading(false);
      }
    };

    fetchClientSecret();
  }, [bookingId]);

  if (loading) return <img src={spinner} alt="Loading..." className="centerObject" />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <main className="PaymentOverview">
      <div className="right-panel">
        <h1>Complete Your Booking</h1>
        <p>Your request has been accepted by the host. Complete your payment to confirm the booking.</p>
        {stripeClientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
            <SetupForm bookingId={bookingId} loading={false} handleConfirmAndPay={() => {}} />
          </Elements>
        )}
        <button
          className="view-booking-button"
          onClick={() => navigate("/guestdashboard/bookings")}
          style={{ marginTop: "1rem" }}
        >
          Back to Bookings
        </button>
      </div>
    </main>
  );
};

export default InquiryPaymentPage;
