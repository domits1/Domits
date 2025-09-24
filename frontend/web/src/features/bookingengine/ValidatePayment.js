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

    const intent = stripe.retrievePaymentIntent(clientSecret);

    const clientSecret = new URLSearchParams(window.location.search).get(`payment_intent_client_secret`);
    if (!clientSecret) {
      setMessage("Missing Client Secret in URL. Please contact support.");
    }

    const checkPayment = async () => {
      stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
        const bookingId = new URLSearchParams(window.location.search).get("id");

        if (!paymentIntent) {
          console.error("No PaymentIntent received!!");
          return;
        }
        console.log(paymentIntent);
        setLoading(false);
        switch (paymentIntent.status) {
          case "succeeded":
            setMessage(`Success! Payment received.`);
            ActivateBookingFunction(paymentIntent.id);
            navigate(`/bookingconfirmationoverview?&id=${bookingId}&paymentId=${paymentIntent.id}`);
            break;

          case "processing":
            setMessage(
              `Payment is still processing. Checking again... (If this occurs for a longer time, please contact dev)`
            );
            setTimeout(checkPayment, 2000);
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
    };
    checkPayment();
  }, [stripe]);

  const ActivateBookingFunction = async (paymentid) => {
    await ActivateBooking(paymentid);
  };

  return (
    <>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h1>{message}</h1>
          <p>Something went wrong. Was this unexpected behaviour? Contact the support team.</p>
        </>
      )}
    </>
  );
};

export default ValidatePayment;
