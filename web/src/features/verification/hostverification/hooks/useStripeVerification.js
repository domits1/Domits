import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { startVerificationAPI } from "../services/HostVerifyServices";
import { getVerificationStatusFromDB } from "../services/HostVerifyServices";

// const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

function useStripeVerification(userData) {
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeErrorMessage, setStripeErrorMessage] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [toastConfig, setToastConfig] = useState({
    message: "",
    status: "",
    duration: 3000,
  });

  const fetchData = async () => {
    setStripeLoading(true);
    try {
      const status = await getVerificationStatusFromDB(userData.userId);
      if (status.lastErrorReason) {
        setVerificationStatus({
          status: status.lastErrorReason,
          Image: <img width='16px' height='16px' src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Flat_cross_icon.svg/1024px-Flat_cross_icon.svg.png"/>,});
      }
      if (status.verificationStatus === "processing") {
        setVerificationStatus({
          status: "Pending",
          Image: <img width='16px' height='16px' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6nOI0usYypR7m6rWTeQuhZ39rtmiS5aTsDw&s"/>,});
      }
      if (status.verificationStatus === "verified") {
        setVerificationStatus({
          Image: <img width='16px' height='16px'  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Eo_circle_green_checkmark.svg/2048px-Eo_circle_green_checkmark.svg.png"/>,
          status: "Completed",
        });
      }
      setStripeLoading(false);
    } catch (error) {
      setStripeErrorMessage("Failed to fetch verification status: ", error);
      setStripeLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userData.userId]);

  const startVerification = async () => {
    setStripeLoading(true);
    setStripeErrorMessage("");

    if(verificationStatus.status === "Completed"){
      setToastConfig({
        message: "Verification already completed",
        status: "warning",
        duration: 3000,
      });
      setStripeLoading(false);
      return;
    }
    if(verificationStatus.status === "Pending"){
      setToastConfig({
        message: "Verification already in progress",
        status: "warning",
        duration: 3000,
      });
      setStripeLoading(false);
      return;
    }

    try {
      const { clientSecret } = await startVerificationAPI(userData);

      if (!clientSecret) {
        throw new Error("No client secret returned");
      }

      const stripe = await stripePromise;
      const result = await stripe.verifyIdentity(clientSecret);

      if (result.error) {
        throw new Error(result.error.message);
      } else {
        fetchData();
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
    toastConfig,
    setToastConfig,
  };
}

export default useStripeVerification;
