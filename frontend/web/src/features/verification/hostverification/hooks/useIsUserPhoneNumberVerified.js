import { useState, useEffect } from "react";
import { getPhoneNumberVerificationStatus } from "../services/HostVerifyServices"; // Import your API function
import { useNavigate } from "react-router-dom";

function useIsUserPhoneNumberVerified(userId) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [verificationStatus, setVerificationStatus] = useState("");
    const [toastConfig, setToastConfig] = useState({
        message: "",
        status: "",
        duration: 3000,
    });

    const fetchVerificationStatus = async () => {
        setLoading(true);
        try {
            const status = await getPhoneNumberVerificationStatus(userId);

            if (status.is_verified) {
                setVerificationStatus({
                    status: "Completed",
                    Image: (
                        <img
                            width="16px"
                            height="16px"
                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Eo_circle_green_checkmark.svg/2048px-Eo_circle_green_checkmark.svg.png"
                            alt="Verified"
                        />
                    ),
                });
            }
        } catch (error) {
            if (error.message.includes("404")) {
                return;
            }
            setErrorMessage("Failed to fetch phone number verification status.");
            setToastConfig({
                message: "Failed to fetch verification status.",
                status: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const startVerification = async () => {
        if (verificationStatus.status === "verified") {
            setToastConfig({
                message: "Verification already completed",
                status: "warning",
                duration: 3000,
            });
            return;
        }

        navigate("/verify/phonenumber");
    };

    useEffect(() => {
        fetchVerificationStatus();
    }, [userId]);

    return {
        loading,
        errorMessage,
        verificationStatus,
        toastConfig,
        setToastConfig,
        startVerification,
    };
}

export default useIsUserPhoneNumberVerified;
