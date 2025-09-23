import React, { useEffect, useState, useRef } from "react";
import "./HostFinanceTab.css";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "../../services/getAccessToken";

const HostFinanceTab = () => {
  const navigate = useNavigate();
  const [bankDetailsProvided, setBankDetailsProvided] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [payoutFrequency, setPayoutFrequency] = useState("weekly");
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(null);

  const handleEnlistNavigation = () => {
    navigate("/hostonboarding");
  };

  const handleNavigation = (value) => {
    navigate(value);
  };

  const handlePayoutFrequencyChange = (event) => {
    setPayoutFrequency(event.target.value);
  };

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const authToken = await getAccessToken();

        const response = await fetch("https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments", {
          method: "GET",
          headers: { Authorization: authToken },
        });

        if (response.status === 404) {
          return;
        }
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const details = data.details;
        console.log("Fetched user data and Stripe status:", details);

        setBankDetailsProvided(details.bankDetailsProvided);
        setAccountId(details.accountId);
        setOnboardingComplete(details.onboardingComplete);
      } catch (error) {
        console.error("Error fetching user data or Stripe status:", error);
      } finally {
        setLoading(false);
      }
    };
    getUserInfo();
  }, []);

  async function handleStripeAction() {
    try {
      if (isProcessing) return;
      setIsProcessing(true);
      setProcessingStep("working");

      const authToken = await getAccessToken();

      let details;
      if (!accountId) {
        const createRes = await fetch("https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments", {
          method: "POST",
          headers: { Authorization: authToken },
        });
        if (!createRes.ok) {
          throw new Error(`HTTP error! Status: ${createRes.status}`);
        }
        const createData = await createRes.json();
        details = createData.details;
        if (details.accountId) setAccountId(details.accountId);
        setOnboardingComplete(false);
      } else {
        const res = await fetch("https://hamuly8izh.execute-api.eu-north-1.amazonaws.com/development/payments", {
          method: "GET",
          headers: { Authorization: authToken },
        });
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        const data = await res.json();
        details = data.details;
      }

      const urlToOpen = details.onboardingComplete ? details.loginLinkUrl : details.onboardingUrl;
      if (!urlToOpen) {
        throw new Error("No URL returned from server");
      }

      setProcessingStep("opening");
      setTimeout(() => {
        window.location.replace(urlToOpen);
      }, 100);
    } catch (error) {
      console.error("Error during Stripe action:", error);
      setProcessingStep(null);
      setIsProcessing(false);
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  const renderCtaLabel = (idleText) =>
    isProcessing ? (processingStep === "opening" ? "Opening link…" : "Working on it…") : idleText;

  return (
    <main className="page-Host">
      <h2>Finance</h2>
      <div className="page-Host-content">
        <section className="host-pc-finance">
          <div className="finance-content">
            <div className="finance-steps">
              <h2>Receive payouts in 3 steps</h2>
              <ul>
                <li>
                  <strong>Step 1: </strong>{" "}
                  <span className="finance-span" onClick={handleEnlistNavigation}>
                    List your property.
                  </span>
                </li>

                <li>
                  {!accountId ? (
                    <>
                      <strong>Step 2: </strong> Once your accommodation is created, you can create a Stripe account to
                      receive payments:{" "}
                      <span
                        className={`finance-span ${isProcessing ? "disabled" : ""}`}
                        onClick={!isProcessing ? handleStripeAction : undefined}>
                        {renderCtaLabel("Create Stripe account")}
                      </span>
                    </>
                  ) : !onboardingComplete ? (
                    <>
                      <strong>Step 2: </strong> Finish your Stripe onboarding to start receiving payouts:{" "}
                      <span
                        className={`finance-span ${isProcessing ? "disabled" : ""}`}
                        onClick={!isProcessing ? handleStripeAction : undefined}>
                        {renderCtaLabel("Continue Stripe onboarding")}
                      </span>
                    </>
                  ) : (
                    <>
                      ✔ <strong>Step 2: </strong> You’re connected to Stripe. Well done! Now{" "}
                      <span
                        className={`finance-span ${isProcessing ? "disabled" : ""}`}
                        onClick={!isProcessing ? handleStripeAction : undefined}>
                        {renderCtaLabel("Open Stripe Dashboard")}
                      </span>
                    </>
                  )}
                </li>

                <li>
                  <strong>Step 3: </strong> Set your property live{" "}
                  <span className="finance-span" onClick={() => handleNavigation("/hostdashboard/listings")}>
                    here
                  </span>{" "}
                  to receive payouts.
                </li>
              </ul>
            </div>

            <div className="payouts-section">
              <h3>Recent Payouts</h3>
              {payouts.length > 0 ? (
                <table className="payout-table">
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Arrival Date</th>
                      <th>Type</th>
                      <th>Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id}>
                        <td>{(payout.amount / 100).toFixed(2)}</td>
                        <td className={payout.status}>{payout.status}</td>
                        <td>{payout.arrivalDate}</td>
                        <td>{payout.type === "instant" ? "Instant" : "Standard"}</td>
                        <td>{payout.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No payouts found.</p>
              )}
            </div>

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
              {payouts.length > 0 && payouts.some((payout) => payout.status === "paid") ? (
                <p className="status-active">✅ Your payouts are active. Last payout: {payouts[0].arrivalDate}.</p>
              ) : payouts.length > 0 && payouts.some((payout) => payout.status === "pending") ? (
                <p className="status-pending">
                  ⌛ Your payouts are scheduled. Next payout: {payouts.find((p) => p.status === "pending")?.arrivalDate}
                  .
                </p>
              ) : payouts.length > 0 && payouts.every((payout) => payout.status !== "paid") ? (
                <p className="status-error">
                  🚨 There was an issue with your payouts:{" "}
                  {payouts.find((p) => p.failureMessage)?.failureMessage || "Unknown issue"}.
                </p>
              ) : (
                <p className="status-none">
                  ℹ️ No payouts found. Once you start receiving bookings, your payouts will appear here.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default HostFinanceTab;
