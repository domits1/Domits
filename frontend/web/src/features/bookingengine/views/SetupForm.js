import React, { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import "../../../styles/sass/features/booking-engine/bookingoverview.scss"

const SetupForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event) => {
    try {
      event.preventDefault();
      if (!stripe || !elements) {
        console.error(`Stripe/Elements not loaded yet. Refresh the page and try again.`);
        return;
      }
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/validatepayment`,
        },
      });
      if (error) {
        console.error(error);
      }
    } catch (error) {
      setErrorMessage(error.message);
      throw new Error(`Unable to submit your payment. Contact the devs. Error: ${error}`);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button className="confirm-pay-button" disabled={!stripe}>Submit</button>
      {errorMessage && <div>{errorMessage}</div>}
    </form>
  );
};

export default SetupForm;
