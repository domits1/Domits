import React, { useState, useEffect } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";
import { useNavigate } from "react-router-dom";
import ActivateBooking from "./services/ActivateBooking";
import DeactivateBooking from "./services/DeactivateBooking";

const ValidatePayment = () => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
        `payment_intent_client_secret`
    );

    stripe
    .retrievePaymentIntent(clientSecret)
    .then(({paymentIntent}) => {

      const bookingId = new URLSearchParams(window.location.search).get(
        'id'
      )

      setLoading(false);

      switch (paymentIntent.status) {
        case "succeeded":
          setMessage(`Success! Payment received.`);
          ActivateBookingFunction(paymentIntent.id);
          navigate(`/bookingconfirmationoverview?&id=${bookingId}&paymentId=${paymentIntent.id}`)
          break;

        case "processing":
          setMessage(`Payment processing. We'll update you when payment is received.`);
          navigate(`/bookingconfirmationoverview?&id=${bookingId}&paymentId=${paymentIntent.id}`)
          break;

        case "requires_payment_method":
          DeactivateBooking(paymentIntent.id);
          setMessage(`Payment failed. Please try another payment method. No charges have been made.`);
          break;

        default:
          setMessage(`Something went wrong. Please contact support with error ${paymentIntent.status}.`);
          break;
      }
    });
  }, [stripe]);

  const ActivateBookingFunction = async (paymentid) => {
      await ActivateBooking(paymentid);
  }
  
  return (
    <>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>{message}</h1>
          <p>Was this unexpected behaviour? Contact the support team.</p>
        </>
      )}
    </>
  )
};

export default ValidatePayment;
