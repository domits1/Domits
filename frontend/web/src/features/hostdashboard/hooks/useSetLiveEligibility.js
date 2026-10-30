import { useCallback, useState } from "react";
import {
  getStripeAccountDetails,
  isStripePayoutSetupComplete,
} from "../hostfinance/services/stripeAccountService";

export const useSetLiveEligibility = () => {
  const [liveEligibility, setLiveEligibility] = useState(false);
  const [liveEligibilityError, setLiveEligibilityError] = useState("");
  const [liveEligibilityLoading, setLiveEligibilityLoading] = useState(false);

  const fetchLiveEligibility = useCallback(async () => {
    setLiveEligibilityLoading(true);
    setLiveEligibilityError("");
    try {
      const stripeDetails = await getStripeAccountDetails();
      const isEligible = isStripePayoutSetupComplete(stripeDetails);
      setLiveEligibility(isEligible);
      return isEligible;
    } catch (error) {
      setLiveEligibility(false);
      setLiveEligibilityError(error?.message || "Failed to verify Stripe payout setup.");
      return false;
    } finally {
      setLiveEligibilityLoading(false);
    }
  }, []);

  return {
    liveEligibility,
    liveEligibilityError,
    liveEligibilityLoading,
    fetchLiveEligibility,
  };
};
