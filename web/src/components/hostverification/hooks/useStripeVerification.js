import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { startVerificationAPI } from "../services/verificationServices";

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

function useStripeVerification() {
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeErrorMessage, setStripeErrorMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState(null);

  const startVerification = async () => {
    setStripeLoading(true);
    setStripeErrorMessage("");
    setVerificationStatus(null);

    try {
      const { clientSecret } = await startVerificationAPI(
        "123"
      );

      if (!clientSecret) {
        throw new Error("No client secret returned");
      }

      const stripe = await stripePromise;
      const result = await stripe.verifyIdentity(clientSecret);

      console.log("Stripe result: ", result.verificationSession);

      if (result.error) {
        setStripeErrorMessage(result.error.message);
      } else if (
        result.verification_session &&
        result.verification_session.status
      ) {
        const verificationStatus = result.verification_session.status;
        console.log("Stripe result: ", verificationStatus);
        setVerificationStatus(verificationStatus);
      } else {
        console.error('No verification session returned');
      }
    } catch (error) {
      setStripeErrorMessage(`Failed to start verification: ${error.message}`);
    } finally {
      setStripeLoading(false);
    }
  };

  return {
    stripeLoading,
    stripeErrorMessage,
    startVerification,
    verificationStatus,
  };
}

export default useStripeVerification;