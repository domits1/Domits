import { useCallback, useState } from "react";
import { getStripeAccountDetails } from "../hostfinance/services/stripeAccountService";

export const isLiveEligible = (stripeDetails) => Boolean(stripeDetails?.bankDetailsProvided);

export const useSetLiveEligibility = () => {
  const [liveEligibility, setLiveEligibility] = useState(false);
  const [liveEligibilityError, setLiveEligibilityError] = useState("");
  const [liveEligibilityLoading, setLiveEligibilityLoading] = useState(false);

  const fetchLiveEligibility = useCallback(async () => {
    setLiveEligibilityLoading(true);
    setLiveEligibilityError("");

    try {
      const stripeDetails = await getStripeAccountDetails();
      const eligible = isLiveEligible(stripeDetails);
      setLiveEligibility(eligible);
      return eligible;
    } catch (error) {
      setLiveEligibility(false);
      setLiveEligibilityError(error?.message || "Failed to fetch bank details status.");
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
