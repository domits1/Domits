import styles from "./styles/hostverification.module.css";
import Option from "./components/Option";
import useStripeVerification from "./hooks/useStripeVerification";
import useIsUserPhoneNumberVerified from "./hooks/useIsUserPhoneNumberVerified";
import Loading from "./components/Loading";
import Toast from "../../../components/toast/Toast";
import { Auth } from "aws-amplify";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

const HostVerificationView = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId, accommodationId } = location.state || {};
    const [userIdd, setUserIdd] = useState(null);

    useEffect(() => {
        const asyncUserId = async () => {
            try {
                const userInfo = await Auth.currentAuthenticatedUser();
                await setUserIdd(userInfo.attributes.sub);
            } catch (error) {
                console.error("Error setting user id:", error);
            }
        };
        asyncUserId();
    }, []);

    const userData = {
        userId: userId || userIdd,
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

    const {
        loading: phoneLoading,
        errorMessage: phoneErrorMessage,
        verificationStatus: phoneVerificationStatus,
        toastConfig: phoneToastConfig,
        startVerification: startPhoneVerification,
    } = useIsUserPhoneNumberVerified(userData.userId);

    if (stripeLoading || phoneLoading) {
        return <Loading />;
    }

    const isVerificationDisabled = verificationStatus.status === "Completed";
    const verificationText = verificationStatus.status
        ? verificationStatus.status
        : "Required";

    const isPhoneVerificationDisabled = phoneVerificationStatus === "verified";
    const phoneVerificationText = phoneVerificationStatus.status || "Optional";

    const isPublishDisabled = !isVerificationDisabled;

    const handleBackToPublishListing = () => {
        navigate("/hostdashboard/listings");
    };

    return (
        <main className={styles["main-container"]}>
            <Toast
                message={toastConfig.message || phoneToastConfig.message}
                status={toastConfig.status || phoneToastConfig.status}
                duration={toastConfig.duration || phoneToastConfig.duration}
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
                    onClick={!isPhoneVerificationDisabled ? startPhoneVerification : undefined}
                    statusIcon={phoneVerificationStatus.Image}
                    statusText={phoneVerificationText}
                />
            </div>
            <hr></hr>
            <div className={styles["bottom-container"]}>
                <button
                    className={`${styles["publish-btn"]} ${
                        isPublishDisabled ? styles["disabled-btn"] : ""
                    }`}
                    disabled={isPublishDisabled}
                    onClick={handleBackToPublishListing}
                >
                    Go Back To Publish Listing
                </button>
            </div>
        </main>
    );
};

export default HostVerificationView;
