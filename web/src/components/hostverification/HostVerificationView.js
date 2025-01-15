import styles from "./hostverification.module.css";
import Option from "./components/Option";
import useStripeVerification from "./hooks/useStripeVerification";
import Loading from "./components/Loading";
import Toast from "../toast/Toast";
import { useLocation } from "react-router-dom";

const HostVerificationView = () => {
  const location = useLocation();
  const { userId, accommodationId } = location.state || {};

  const userData = {
    userId: "100f12f1-244a-494b-9eb0-2cd3d25e47bg2",
    firstName: "undefined",
    lastName: "undefined",
  };

  const {
    stripeLoading,
    stripeErrorMessage,
    startVerification,
    verificationStatus,
    toastConfig,
    setToastConfig,
  } = useStripeVerification(userData);

  console.log("User ID:", userId);
  console.log("Accommodation ID:", accommodationId);

  if (stripeLoading) {
    return <Loading />;
  }

  const isVerificationDisabled = verificationStatus === "verified";
  const verificationText = verificationStatus.status ? verificationStatus.status : "Required";

  return (
    <main className={styles["main-container"]}>
      <Toast
        message={toastConfig.message}
        status={toastConfig.status}
        duration={toastConfig.duration}
        onClose={() =>
          setToastConfig({ message: "", status: "", duration: 3000 })
        }
      />
      <div className={styles["left-container"]}>
        <h1>What is the next step?</h1>
        <Option
          option="Verify your identity"
          subtext="Tell us how you host and share a few required details."
          onClick={!isVerificationDisabled ? startVerification : undefined}
          statusIcon={verificationStatus.Image}
          statusText={verificationText}
          disabled={isVerificationDisabled}
        />
        <hr></hr>
        <Option
          option="Confirm your phone number"
          subtext="We will text to confirm your number."
          statusText = "Optional"
        />
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
        <button className={styles["publish-btn"]}>Publish Listing</button>
      </div>
    </main>
  );
};

export default HostVerificationView;
