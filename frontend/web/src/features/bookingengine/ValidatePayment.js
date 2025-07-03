import React, { useState, useEffect } from "react";
import { useStripe, useElements } from "@stripe/react-stripe-js";

const ValidatePayment = () => {
  const stripe = useStripe();
const elements = useElements();
  const [message, setMessage] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
        `payment_intent_client_secret`
    );

    setBookingId(new URLSearchParams(window.location.search).get(
      'bookingId'
    )
) 
    console.log(bookingId);
    stripe
    .retrievePaymentIntent(clientSecret)
    .then(({paymentIntent}) => {
      // Inspect the PaymentIntent `status` to indicate the status of the payment
      // to your customer.
      //
      // Some payment methods will [immediately succeed or fail][0] upon
      // confirmation, while others will first enter a `processing` state.
      //
      // [0]: https://stripe.com/docs/payments/payment-methods#payment-notification
      switch (paymentIntent.status) {
        case "succeeded":
          setMessage(`Success! Payment received.`);
          //change paid bool to true
          break;

        case "processing":
          setMessage(`Payment processing. We'll update you when payment is received.`);
          //Add implementation, push message/email when payment is succeed/failed.
          break;

        case "requires_payment_method":
          setMessage(`Payment failed. Please try another payment method. No charges have been made.`);
          break;

        default:
          setMessage(`Something went wrong. Please contact support with error ${paymentIntent.status}.`);
          break;
      }
    });
  }, [stripe]);
  
  return (
    <>
        <h1>{message}</h1>
        <p>Devnote: Do something with this bookingID: {bookingId}</p>
    </>
  )
};

export default ValidatePayment;
