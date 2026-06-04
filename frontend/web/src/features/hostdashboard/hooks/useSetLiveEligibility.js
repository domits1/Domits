import { useCallback, useState } from "react";
import { getVerificationStatusFromDB } from "../../verification/hostverification/services/HostVerifyServices";

export const useSetLiveEligibility = ({ userId }) => {
  const [liveEligibility, setLiveEligibility] = useState(false);
  const [liveEligibilityError, setLiveEligibilityError] = useState("");
  const [liveEligibilityLoading, setLiveEligibilityLoading] = useState(false);

  const fetchVerificationStatus = useCallback(async () => {
    if (!userId) {
      setLiveEligibility(false);
      setLiveEligibilityError("Host user is not loaded.");
      return false;
    }

    setLiveEligibilityLoading(true);
    setLiveEligibilityError("");
    try {
      const status = await getVerificationStatusFromDB(userId);
      const isVerified = status.verificationStatus === "verified";
      setLiveEligibility(isVerified);
      return isVerified;
    } catch (error) {
      setLiveEligibility(false);
      if (error.statusCode === 404) {
        return false;
      }
      setLiveEligibilityError(error?.message || "Failed to fetch verification status.");
      return false;
    } finally {
      setLiveEligibilityLoading(false);
    }
  }, [userId]);

  return {
    liveEligibility,
    liveEligibilityError,
    liveEligibilityLoading,
    fetchVerificationStatus,
  };
};