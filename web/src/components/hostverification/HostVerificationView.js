import styles from "./hostverification.module.css";
import Option from "./components/Option";
import useStripeVerification from "./hooks/useStripeVerification";
import Loading from "./components/Loading";
import { useEffect } from "react";

const HostVerificationView = () => {
  const {
    stripeLoading,
    stripeErrorMessage,
    startVerification,
    verificationStatus,
  } = useStripeVerification();

  useEffect(() => {
    if (verificationStatus === "verified") {
      console.log("User successfully verified");
    } else if (verificationStatus === "unverified") {
      console.log("User verification failed");
    }
  }, [verificationStatus]);

  // if(error) {
  //   return <p>Something went wrong {error.message}</p>;
  // }

  // if (loading) {
  //   return <Loading/>;
  // }

  return (
    <main className={styles["main-container"]}>
      <div className={styles["left-container"]}>
        <h1>What is the next step?</h1>
        <Option
          option="Verify your identity"
          subtext="Tell us how you host and share a few required details."
          onClick={() => console.log("Verify identity clicked")}
        />
        <hr></hr>
        <Option option="Connect with stripe to receive payments" />
        <hr></hr>
        <Option
          option="Confirm your phone number"
          subtext="We will text to confirm your number."
        />
      </div>
      <div className={styles["right-container"]}>
        {/* <Listing data={data}/> */}
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
        <button className={styles["publish-btn"]}>Publish Listing</button>
      </div>
      <div>
        <h1>Stripe Identity Verification</h1>
        <button onClick={startVerification} disabled={stripeLoading}>
          {stripeLoading ? "Loading..." : "Start Verification"}
        </button>
        {stripeErrorMessage && (
          <p style={{ color: "red" }}>{stripeErrorMessage}</p>
        )}
        {verificationStatus && <p>Verification status: {verificationStatus}</p>}
      </div>
    </main>
  );
};

export default HostVerificationView;
