import React, { useEffect, useState } from "react";
import Pages from "./Pages.js";
import "./styles/HostFinanceTab.css";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

const HostFinanceTab = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState(null);
  const [cognitoUserId, setCognitoUserId] = useState(null);
  const [stripeLoginUrl, setStripeLoginUrl] = useState(null);
  const [bankDetailsProvided, setBankDetailsProvided] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [accountId, setAccountId] = useState(null);
  const [payoutFrequency, setPayoutFrequency] = useState("weekly");

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
    const setUserEmailAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserEmail(userInfo.attributes.email);
        setCognitoUserId(userInfo.attributes.sub);

        const response = await fetch(
          `https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`,
          {
            method: "POST",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({ sub: userInfo.attributes.sub }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        const parsedBody = JSON.parse(data.body);

        if (parsedBody.hasStripeAccount) {
          setStripeLoginUrl(parsedBody.loginLinkUrl);
          setBankDetailsProvided(parsedBody.bankDetailsProvided);
          setAccountId(parsedBody.accountId);
        }
      } catch (error) {
        console.error("Error fetching user data or Stripe status:", error);
      } finally {
        setLoading(false);
      }
    };
    setUserEmailAsync();
  }, []);

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!accountId) return;

      try {
        const response = await fetch(
          "https://ayoe94cs72.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-CRUD-fetchHostPayout",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ userId: accountId }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setPayouts(data.payoutDetails || []);
      } catch (error) {
        console.error("Error fetching payouts:", error);
      }
    };

    fetchPayouts();
  }, [accountId]);

  async function handleStripeAction() {
    if (userEmail && cognitoUserId) {
      const options = {
        userEmail: userEmail,
        cognitoUserId: cognitoUserId,
      };
      try {
        const response = await fetch(
          "https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount",
          {
            method: "POST",
            body: JSON.stringify(options),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        window.location.replace(data.url);
      } catch (error) {
        console.error("Error during Stripe action:", error);
      }
    } else {
      console.error("User email or cognitoUserId is not defined.");
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  console.log("Stripe Login URL:", stripeLoginUrl);
  console.log("Bank Details Provided:", bankDetailsProvided);

  return (
    <main className="page-Host">
      <h2>Finance</h2>
      <div className="page-Host-content">
        <div className="sidebar">
          <Pages />
        </div>
        <section className="host-pc-finance">
          <div className="finance-content">
            <div className="finance-steps">
              <h2>Receive payouts in 3 steps</h2>
              <ul>
                <li>
                  <strong>Step 1: </strong>{" "}
                  <span
                    className="finance-span"
                    onClick={handleEnlistNavigation}
                  >
                    List your property.
                  </span>
                </li>

                <li>
                  {stripeLoginUrl ? (
                    bankDetailsProvided ? (
                      <>
                        ✔ <strong>Step 2: </strong> You are connected to
                        Stripe!
                      </>
                    ) : (
                      <>
                        <strong>Step 2: </strong> Connect your bank details with
                        our payment partner{" "}
                        <span
                          className="finance-span"
                          onClick={handleStripeAction}
                        >
                          Stripe.
                        </span>
                      </>
                    )
                  ) : (
                    <>
                      <strong>Step 2: </strong> Once your accommodation is
                      created, you can create a Stripe account to receive
                      payments:{" "}
                      <span
                        className="finance-span"
                        onClick={handleStripeAction}
                      >
                        Domits Stripe
                      </span>
                    </>
                  )}
                </li>

                <li>
                  <strong>Step 3: </strong> Set your property live{" "}
                  <span
                    className="finance-span"
                    onClick={() => handleNavigation("/hostdashboard/listings")}
                  >
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
                        <td>
                          {payout.type === "instant" ? "Instant" : "Standard"}
                        </td>
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
              <select
                value={payoutFrequency}
                onChange={handlePayoutFrequencyChange}
              >
                <option value="daily">Daily (24h after check-out)</option>
                <option value="weekly">Weekly (Every Monday)</option>
                <option value="monthly">Monthly (First of the month)</option>
              </select>
            </div>

            <div className="payout-status">
              <h3>Payout Status:</h3>
              {payouts.length > 0 &&
              payouts.some((payout) => payout.status === "paid") ? (
                <p className="status-active">
                  ✅ Your payouts are active. Last payout:{" "}
                  {payouts[0].arrivalDate}.
                </p>
              ) : payouts.length > 0 &&
                payouts.some((payout) => payout.status === "pending") ? (
                <p className="status-pending">
                  ⌛ Your payouts are scheduled. Next payout:{" "}
                  {payouts.find((p) => p.status === "pending")?.arrivalDate}.
                </p>
              ) : payouts.length > 0 &&
                payouts.every((payout) => payout.status !== "paid") ? (
                <p className="status-error">
                  🚨 There was an issue with your payouts:{" "}
                  {payouts.find((p) => p.failureMessage)?.failureMessage ||
                    "Unknown issue"}
                  .
                </p>
              ) : (
                <p className="status-none">
                  ℹ️ No payouts found. Once you start receiving bookings, your
                  payouts will appear here.
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
