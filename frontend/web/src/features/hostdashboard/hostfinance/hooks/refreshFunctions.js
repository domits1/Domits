import { useEffect, useMemo, useRef, useState } from "react";
import {
  getStripeAccountDetails,
  createStripeAccount,
  getCharges,
  getPayouts,
  getHostBalance,
  getPayoutSchedule,
  setPayoutSchedule,
  getFaqs,
} from "../services/stripeAccountService";

// Finance data does not need second-by-second polling. Focus refreshes still run,
// and a slower background interval reduces dashboard churn while keeping data fresh.
const REFRESH_INTERVAL_MS = 30000;

export function RefreshFunctions() {
  const [payouts, setPayouts] = useState([]);
  const [charges, setCharges] = useState([]);
  const [hostBalance, setHostBalance] = useState({ available: [], pending: [] });
  const [accountId, setAccountId] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [chargesEnabled, setChargesEnabled] = useState(true);
  const [payoutsEnabled, setPayoutsEnabled] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(null);
  const [payoutInterval, setPayoutInterval] = useState(null);
  const [weekly_anchor, setWeeklyAnchor] = useState(null);
  const [monthly_anchor, setMonthlyAnchor] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loadingStates, setLoadingStates] = useState({
    account: true,
    charges: true,
    payouts: true,
    hostBalance: true,
    getPayoutSchedule: true,
    faqs: true,
  });

  const [toast, setToast] = useState(null);

  const isMountedRef = useRef(false);
  const toastTimeoutRef = useRef(null);

  const updateLoadingState = (key, value) => setLoadingStates((prev) => ({ ...prev, [key]: value }));

  function showToast(message, type = "success") {
    setToast({ message, type });
    clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2000);
  }

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      try {
        updateLoadingState("account", true);
        const details = await getStripeAccountDetails();
        if (!details) return;
        setAccountId(details.accountId);
        setOnboardingComplete(details.onboardingComplete);
        setChargesEnabled(details.chargesEnabled ?? true);
        setPayoutsEnabled(details.payoutsEnabled ?? true);
      } catch (error) {
        console.error("Error fetching user data or Stripe status:", error);
      } finally {
        updateLoadingState("account", false);
      }
    })();

    (async () => {
      try {
        updateLoadingState("charges", true);
        const details = await getCharges();
        setCharges(details?.charges ?? []);
      } catch (error) {
        console.error("Error fetching charges:", error);
      } finally {
        updateLoadingState("charges", false);
      }
    })();

    (async () => {
      try {
        updateLoadingState("hostBalance", true);
        const details = await getHostBalance();
        setHostBalance(details ?? { available: [], pending: [] });
      } catch (error) {
        console.error("Error fetching host balance:", error);
      } finally {
        updateLoadingState("hostBalance", false);
      }
    })();

    (async () => {
      try {
        updateLoadingState("payouts", true);
        const details = await getPayouts();
        setPayouts(details?.payouts ?? []);
      } catch (error) {
        console.error("Error fetching payouts:", error);
      } finally {
        updateLoadingState("payouts", false);
      }
    })();

    (async () => {
      try {
        updateLoadingState("getPayoutSchedule", true);
        const details = await getPayoutSchedule();
        setPayoutInterval(details?.interval || null);
        setWeeklyAnchor(details?.weekly_anchor || null);
        setMonthlyAnchor(details?.monthly_anchor || null);
      } catch (error) {
        console.error("Error fetching host payout schedule:", error);
      } finally {
        updateLoadingState("getPayoutSchedule", false);
      }
    })();

    (async () => {
      try {
        updateLoadingState("faqs", true);
        const details = await getFaqs();
        setFaqs(details?.faqs ?? []);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
      } finally {
        updateLoadingState("faqs", false);
      }
    })();

    return () => {
      isMountedRef.current = false;
      clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  async function refreshAccountSilent() {
    try {
      const details = await getStripeAccountDetails();
      if (!isMountedRef.current) return;
      setAccountId(details?.accountId ?? null);
      setOnboardingComplete(!!details?.onboardingComplete);
      setChargesEnabled(details?.chargesEnabled ?? true);
      setPayoutsEnabled(details?.payoutsEnabled ?? true);
    } catch (e) {
      console.error("silent account refresh failed:", e);
    }
  }
  async function refreshChargesSilent() {
    try {
      const details = await getCharges();
      if (!isMountedRef.current) return;
      setCharges(details?.charges ?? []);
    } catch (e) {
      console.error("silent charges refresh failed:", e);
    }
  }
  async function refreshPayoutsSilent() {
    try {
      const details = await getPayouts();
      if (!isMountedRef.current) return;
      setPayouts(details?.payouts ?? []);
    } catch (e) {
      console.error("silent payouts refresh failed:", e);
    }
  }
  async function refreshHostBalanceSilent() {
    try {
      const details = await getHostBalance();
      if (!isMountedRef.current) return;
      setHostBalance(details ?? { available: [], pending: [] });
    } catch (e) {
      console.error("silent balance refresh failed:", e);
    }
  }
  async function refreshScheduleSilent() {
    try {
      const details = await getPayoutSchedule();
      if (!isMountedRef.current) return;
      setPayoutInterval(details?.interval || null);
      setWeeklyAnchor(details?.weekly_anchor || null);
      setMonthlyAnchor(details?.monthly_anchor || null);
    } catch (e) {
      console.error("silent schedule refresh failed:", e);
    }
  }

  async function handlePayoutSchedule() {
    try {
      const period = String(payoutInterval || "").toLowerCase();
      const payload = { interval: period };
      if (period === "weekly") {
        if (!weekly_anchor) {
          showToast("Please select a weekday.", "error");
          return;
        }
        payload.weekly_anchor = String(weekly_anchor).toLowerCase();
      }
      if (period === "monthly") {
        if (!monthly_anchor) {
          showToast("Please select a day.", "error");
          return;
        }
        payload.monthly_anchor = monthly_anchor;
      }

      showToast("Payout schedule updated");
      await setPayoutSchedule(payload);
      await refreshScheduleSilent();
    } catch (error) {
      console.error("Error setting payout schedule:", error);
      showToast("Something went wrong, please contact support.", "error");
      await refreshScheduleSilent();
    }
  }

  useEffect(() => {
    const onFocus = () => {
      refreshAccountSilent();
      refreshChargesSilent();
      refreshPayoutsSilent();
      refreshHostBalanceSilent();
      refreshScheduleSilent();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      refreshAccountSilent();
      refreshChargesSilent();
      refreshPayoutsSilent();
      refreshHostBalanceSilent();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const balanceView = useMemo(() => {
    if (!hostBalance || !hostBalance.available || !hostBalance.pending) {
      return { currency: "EUR", availableTotal: 0, incomingTotal: 0, pctAvailable: 0, total: 0 };
    }
    const currency = hostBalance.available[0]?.currency || hostBalance.pending[0]?.currency || "EUR";
    const availableTotal = hostBalance.available.reduce((sum, { amount }) => sum + amount, 0);
    const incomingTotal = hostBalance.pending.reduce((sum, { amount }) => sum + amount, 0);
    const total = availableTotal + incomingTotal;
    const pctAvailable = total ? Math.round((availableTotal / total) * 100) : 0;
    return { currency, availableTotal, incomingTotal, pctAvailable, total };
  }, [hostBalance]);

  async function handleStripeAction() {
    try {
      if (isProcessing) return;
      setIsProcessing(true);
      setProcessingStep("working");

      let details;
      if (!accountId) {
        details = await createStripeAccount();
        if (details.accountId) setAccountId(details.accountId);
        setOnboardingComplete(false);
      } else {
        details = await getStripeAccountDetails();
      }

      const urlToOpen = details.onboardingComplete ? details.loginLinkUrl : details.onboardingUrl;

      setProcessingStep("opening");
      setTimeout(() => window.location.assign(urlToOpen), 200);
    } catch (error) {
      console.error("Error during Stripe action:", error);
      setProcessingStep(null);
      setIsProcessing(false);
    }
  }

  return {
    toast,
    payouts,
    charges,
    hostBalance,
    accountId,
    onboardingComplete,
    chargesEnabled,
    payoutsEnabled,
    isProcessing,
    processingStep,
    payoutInterval,
    weekly_anchor,
    monthly_anchor,
    faqs,
    loadingStates,

    setPayoutInterval,
    setWeeklyAnchor,
    setMonthlyAnchor,

    updateLoadingState,

    balanceView,

    refreshAccountSilent,
    refreshChargesSilent,
    refreshPayoutsSilent,
    refreshHostBalanceSilent,
    refreshScheduleSilent,
    handleStripeAction,
    handlePayoutSchedule,
  };
}
