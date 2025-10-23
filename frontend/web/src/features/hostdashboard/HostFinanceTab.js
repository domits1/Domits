import { useEffect, useState } from "react";
import "./HostFinanceTab.scss";
import { useNavigate } from "react-router-dom";
import { getStripeAccountDetails, createStripeAccount, getCharges, getPayouts } from "./services/stripeAccountService";
import ClipLoader from "react-spinners/ClipLoader";

export default function HostFinanceTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [charges, setCharges] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [payoutFrequency, setPayoutFrequency] = useState("weekly");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(null);

  const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";

  const [loadingStates, setLoadingStates] = useState({
    account: true,
    charges: false,
    payouts: false,
  });

  const updateLoadingState = (key, value) => setLoadingStates((prev) => ({ ...prev, [key]: value }));

  const handleEnlistNavigation = () => navigate("/hostonboarding");
  const handleNavigation = (value) => navigate(value);
  const handlePayoutFrequencyChange = (e) => setPayoutFrequency(e.target.value);

  useEffect(() => {
    (async () => {
      try {
        updateLoadingState("account", true);
        const details = await getStripeAccountDetails();
        if (!details) return;
        setAccountId(details.accountId);
        setOnboardingComplete(details.onboardingComplete);
      } catch (error) {
        console.error("Error fetching user data or Stripe status:", error);
      } finally {
        setLoading(false);
        updateLoadingState("account", false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        updateLoadingState("charges", true);
        const details = await getCharges();
        setCharges(details.charges);
        console.log("Charge details:", details);
      } catch (error) {
        console.error("Error fetching charges:", error);
      } finally {
        setLoading(false);
        updateLoadingState("charges", false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        updateLoadingState("payouts", true);
        const details = await getPayouts();
        setPayouts(details.payouts);
        console.log("Payout details:", details);
      } catch (error) {
        console.error("Error fetching payouts:", error);
      } finally {
        setLoading(false);
        updateLoadingState("payouts", false);
      }
    })();
  }, []);

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
      setTimeout(() => window.location.replace(urlToOpen), 200);
    } catch (error) {
      console.error("Error during Stripe action:", error);
      setProcessingStep(null);
      setIsProcessing(false);
    }
  }

  const formatMoney = (amount, currency, locale = navigator.language || "en-US") => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
      }).format(amount);
    } catch {
      return `${amount?.toFixed?.(2)} ${currency}`;
    }
  };

  const showLoader = loading || Object.values(loadingStates).some(Boolean);
  if (showLoader) {
    return (
      <main className="page-Host page-Host--loading">
        <div className="page-Host__loader">
          <ClipLoader size={100} color="#0D9813" loading />
        </div>
      </main>
    );
  }

  const renderCtaLabel = (idleText) =>
    isProcessing ? (processingStep === "opening" ? "Opening link…" : "Working on it…") : idleText;

  const getStatusMeta = (status) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case "succeeded":
        return { label: "Succeeded", tone: "is-success" };
      case "paid":
        return { label: "Paid", tone: "is-success" };
      case "pending":
        return { label: "Pending", tone: "is-pending" };
      case "failed":
      case "canceled":
      case "cancelled":
        return { label: "Failed", tone: "is-danger" };
      default:
        return { label: status || "Unknown", tone: "is-muted" };
    }
  };

  const StatusBadge = ({ status }) => {
    const meta = getStatusMeta(status);
    return (
      <span className={`status-badge ${meta.tone}`}>
        <span className="status-dot" />
        {meta.label}
      </span>
    );
  };

  return (
    <main className="page-Host">
      <p className="page-Host-title">Finance</p>
      <div className="page-Host-content">
        <section className="host-pc-finance">
          <div className="finance-content">
            <div className="finance-steps">
              <p className="finance-steps-title">Receive your payouts in 3 easy steps</p>
              <ul>
                <li>
                  <strong>Step 1: </strong>
                  &nbsp;&nbsp;
                  <span className="finance-span" onClick={handleEnlistNavigation}>
                    List your property.
                  </span>
                </li>

                <li>
                  {!accountId ? (
                    <>
                      <strong>Step 2: </strong> &nbsp; Once your accommodation is created, you can create a Stripe
                      account to receive payments: &nbsp;
                      <span
                        className={`finance-span ${isProcessing ? "disabled" : ""}`}
                        onClick={!isProcessing ? handleStripeAction : undefined}>
                        {renderCtaLabel("Create Stripe account")}
                      </span>
                    </>
                  ) : !onboardingComplete ? (
                    <>
                      <strong>Step 2: </strong> &nbsp; Finish your Stripe onboarding to start receiving payouts: &nbsp;
                      <span
                        className={`finance-span ${isProcessing ? "disabled" : ""}`}
                        onClick={!isProcessing ? handleStripeAction : undefined}>
                        {renderCtaLabel("Continue Stripe onboarding")}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>Step 2: </strong> &nbsp; You’re connected to Stripe. Well done! &nbsp;
                      <span
                        className={`finance-span ${isProcessing ? "disabled" : ""}`}
                        onClick={!isProcessing ? handleStripeAction : undefined}>
                        {renderCtaLabel("Open Stripe Dashboard")}
                      </span>
                    </>
                  )}
                </li>

                <li>
                  <strong>Step 3: </strong> &nbsp; Set your property live &nbsp;
                  <span className="finance-span" onClick={() => handleNavigation("/hostdashboard/listings")}>
                    here
                  </span>
                  &nbsp; to receive payouts.
                </li>
              </ul>
            </div>

            <div className="payouts-section">
              <h3>Recent Charges</h3>

              {loadingStates.charges ? (
                <div>
                  <ClipLoader loading />
                </div>
              ) : charges.length > 0 ? (
                <div className="table-wrap">
                  <table className="payout-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Property</th>
                        <th>Guest</th>
                        <th>Amount received</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {charges.map((charge, idx) => (
                        <tr key={`${charge.createdDate}-${idx}-${charge.propertyTitle}`}>
                          <td>{charge.createdDate}</td>

                          <td className="property-cell">
                            <img
                              className="property-thumb"
                              src={`${S3_URL}${charge.propertyImage}`}
                              alt={charge.propertyTitle}
                            />
                            <div className="property-meta">
                              <div className="property-title" title={charge.propertyTitle}>
                                {charge.propertyTitle}
                              </div>
                              <div className="property-sub">Booking nr: &nbsp; 834738</div>
                            </div>
                          </td>

                          <td>{charge.customerName}</td>
                          <td>{formatMoney(charge.hostReceives, charge.currency)}</td>
                          <td>
                            <StatusBadge status={charge.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No charges found.</p>
              )}
            </div>

            <div className="payouts-section">
              <h3>Recent Payouts</h3>
              {loadingStates.payouts ? (
                <div style={{ padding: 12 }}>
                  <ClipLoader size={28} loading />
                </div>
              ) : payouts.length > 0 ? (
                <table className="payout-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Arrival Date</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout, i) => (
                      <tr key={`payout-${i}-${payout.arrivalDate}`}>
                        <td>{formatMoney(payout.amount, payout.currency)}</td>
                        <td>
                          <StatusBadge status={payout.status} />
                        </td>
                        <td>{payout.arrivalDate}</td>
                        <td>{payout.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No payouts found.</p>
              )}
            </div>

            {/* Payout Frequency (kept for now) */}
            <div className="payout-frequency">
              <h3>Payout Frequency</h3>
              <select value={payoutFrequency} onChange={handlePayoutFrequencyChange}>
                <option value="daily">Daily (24h after check-out)</option>
                <option value="weekly">Weekly (Every Monday)</option>
                <option value="monthly">Monthly (First of the month)</option>
              </select>
            </div>

            <div className="payout-status">
              <h3>Payout Status:</h3>
              {payouts.length > 0 && payouts.some((p) => p.status === "paid") ? (
                <p className="status-active">Your payouts are active. Last payout: {payouts[0].arrivalDate}.</p>
              ) : payouts.length > 0 && payouts.some((p) => p.status === "pending") ? (
                <p className="status-pending">
                  Your payouts are scheduled. Next payout: {payouts.find((p) => p.status === "pending")?.arrivalDate}.
                </p>
              ) : payouts.length > 0 && payouts.every((p) => p.status !== "paid") ? (
                <p className="status-error">
                  There was an issue with your payouts:{" "}
                  {payouts.find((p) => p.failureMessage)?.failureMessage || "Unknown issue"}.
                </p>
              ) : (
                <p className="status-none">
                  No payouts found. Once you start receiving bookings, your payouts will appear here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
