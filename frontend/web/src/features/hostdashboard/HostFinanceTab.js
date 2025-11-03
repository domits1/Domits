import { useEffect, useState, useMemo } from "react";
import "./HostFinanceTab.scss";
import { useNavigate } from "react-router-dom";
import {
  getStripeAccountDetails,
  createStripeAccount,
  getCharges,
  getPayouts,
  getHostBalance,
  setPayoutSchedule,
} from "./services/stripeAccountService";
import ClipLoader from "react-spinners/ClipLoader";

const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
const MAX_ITEMS_PER_PAGE = 5;
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const getStatusMeta = (status) => {
  const s = String(status).toLowerCase();
  switch (s) {
    case "succeeded":
      return { label: "Succeeded", tone: "is-success" };
    case "paid":
      return { label: "Paid", tone: "is-success" };
    case "pending":
      return { label: "Pending", tone: "is-pending" };
    case "incoming charge - pending":
      return { label: "incoming charge - pending", tone: "is-pending" };
    case "failed":
      return { label: "Failed", tone: "is-danger" };
    case "canceled":
      return { label: "Canceled", tone: "is-danger" };
    case "cancelled":
      return { label: "Cancelled", tone: "is-danger" };
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

const pageSlice = (list, page, size = MAX_ITEMS_PER_PAGE) => list.slice((page - 1) * size, page * size);

const TablePager = ({ page, setPage, totalPages }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="table-pager">
      <button className="pager-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>
      <span className="pager-info">
        Page {page} of {totalPages}
      </span>
      <button className="pager-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
        Next
      </button>
    </div>
  );
};

export default function HostFinanceTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [charges, setCharges] = useState([]);
  const [hostBalance, setHostBalance] = useState({ available: [], pending: [] });
  const [accountId, setAccountId] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(null);
  const [chargesPage, setChargesPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);
  const [interval, setInterval] = useState(null);
  const [weekly_anchor, setWeeklyAnchor] = useState(null);
  const [monthly_anchor, setMonthlyAnchor] = useState(null);
  const [toast, setToast] = useState(null);
  const [loadingStates, setLoadingStates] = useState({
    account: true,
    charges: false,
    payouts: false,
    hostBalance: false,
  });

  const updateLoadingState = (key, value) => setLoadingStates((prev) => ({ ...prev, [key]: value }));

  const handleEnlistNavigation = () => navigate("/hostonboarding");
  const handleNavigation = (value) => navigate(value);

  const chargesTotalPages = Math.max(1, Math.ceil(charges.length / MAX_ITEMS_PER_PAGE));
  const payoutsTotalPages = Math.max(1, Math.ceil(payouts.length / MAX_ITEMS_PER_PAGE));

  useEffect(() => {
    setChargesPage(1);
  }, [charges]);

  useEffect(() => {
    setPayoutsPage(1);
  }, [payouts]);

  function getDaysInMonth(date = new Date()) {
    const y = date.getFullYear();
    const m = date.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }

  const daysInThisMonth = getDaysInMonth();

  function showToast(message, type = "success") {
    setToast({ message, type });
  }

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
        updateLoadingState("hostBalance", true);
        const details = await getHostBalance();
        setHostBalance(details ?? { available: [], pending: [] });
      } catch (error) {
        console.error("Error fetching host balance:", error);
      } finally {
        setLoading(false);
        updateLoadingState("hostBalance", false);
      }
    })();
  }, []);

  const balanceView = useMemo(() => {
    if (!hostBalance || !hostBalance.available || !hostBalance.pending) {
      return {
        currency: "EUR",
        availableTotal: 0,
        incomingTotal: 0,
        pctAvailable: 0,
        total: 0,
      };
    }

    const currency = hostBalance.available[0]?.currency || hostBalance.pending[0]?.currency || "EUR";
    const availableTotal = hostBalance.available.reduce((sum, { amount }) => sum + amount, 0);
    const incomingTotal = hostBalance.pending.reduce((sum, { amount }) => sum + amount, 0);
    const total = availableTotal + incomingTotal;
    const pctAvailable = total ? Math.round((availableTotal / total) * 100) : 0;

    return { currency, availableTotal, incomingTotal, pctAvailable, total };
  }, [hostBalance]);

  useEffect(() => {
    (async () => {
      try {
        updateLoadingState("payouts", true);
        const details = await getPayouts();
        setPayouts(details.payouts);
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

  async function handlePayoutSchedule() {
    try {
      const v = String(interval || "").toLowerCase();
      const payload = { interval: v };
      if (v === "weekly" && weekly_anchor) payload.weekly_anchor = weekly_anchor.toLowerCase();
      if (v === "monthly" && typeof monthly_anchor === "number") payload.monthly_anchor = monthly_anchor;

      showToast("Payout schedule updated");

      await setPayoutSchedule(payload);
    } catch (error) {
      console.error("Error setting payout schedule:", error);
      showToast("Something went wrong, please contact support.", "error");
    }
  }

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
                <>
                  <div className="table-wrap">
                    <table className="payout-table">
                      <thead>
                        <tr>
                          <th>Payment date</th>
                          <th>Property</th>
                          <th>Guest</th>
                          <th>Amount received</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageSlice(charges, chargesPage).map((charge, idx) => (
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
                                <div className="property-sub">Booking nr:&nbsp;{charge.bookingId}</div>
                                <div className="property-sub">Payment id:&nbsp;{charge.paymentId}</div>
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

                  <TablePager page={chargesPage} setPage={setChargesPage} totalPages={chargesTotalPages} />
                </>
              ) : (
                <p>No charges found.</p>
              )}
            </div>

            <div className="payouts-section balance-section">
              <h3>Balance overview</h3>

              {loadingStates.hostBalance ? (
                <div>
                  <ClipLoader size={28} color="#0D9813" loading />
                </div>
              ) : (
                <>
                  <div
                    className="balance-meter"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={balanceView.pctAvailable}>
                    <div
                      className="bm-seg bm-seg--available"
                      style={{ width: `${balanceView.pctAvailable}%` }}
                      data-label="Available"
                      data-value={formatMoney(balanceView.availableTotal, balanceView.currency)}
                    />
                    <div
                      className="bm-seg bm-seg--incoming"
                      style={{
                        width: `${Math.min(100, Math.max(0, (balanceView.incomingTotal / balanceView.total) * 100))}%`,
                      }}
                      data-label="Incoming"
                      data-value={formatMoney(balanceView.incomingTotal, balanceView.currency)}
                    />
                  </div>

                  <div className="balance-list">
                    <div className="balance-header">
                      <span>Payment type</span>
                      <span>Amount</span>
                    </div>
                    <div className="balance-divider" />

                    <div className="balance-item">
                      <div className="balance-left">
                        <span className="balance-dot balance-dot--incoming" />
                        <span className="balance-label">Incoming</span>
                      </div>
                      <div className="balance-amount">
                        {formatMoney(balanceView.incomingTotal, balanceView.currency)}
                      </div>
                    </div>
                    <div className="balance-divider" />

                    <div className="balance-item">
                      <div className="balance-left">
                        <span className="balance-dot balance-dot--available" />
                        <span className="balance-label">Available</span>
                      </div>
                      <div className="balance-amount">
                        {formatMoney(balanceView.availableTotal, balanceView.currency)}
                      </div>
                    </div>
                    <div className="balance-divider" />
                  </div>
                </>
              )}
            </div>

            <div className="payouts-section">
              <h3>Recent Payouts</h3>
              {loadingStates.payouts ? (
                <div style={{ padding: 12 }}>
                  <ClipLoader size={28} loading />
                </div>
              ) : payouts.length > 0 ? (
                <>
                  <div className="table-wrap">
                    <table className="payout-table">
                      <thead>
                        <tr>
                          <th>Payout date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Payout ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageSlice(payouts, payoutsPage).map((payout) => (
                          <tr key={payout.id || `${payout.arrivalDate}-${payout.amount}`}>
                            <td>{payout.arrivalDate}</td>
                            <td>{formatMoney(payout.amount, payout.currency)}</td>
                            <td>
                              <StatusBadge status={payout.status} />
                            </td>
                            <td title={payout.id || ""}>{payout.id || " - "}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <TablePager page={payoutsPage} setPage={setPayoutsPage} totalPages={payoutsTotalPages} />
                </>
              ) : (
                <p>No payouts found.</p>
              )}
            </div>

            <div className="payout-frequency">
              <h3>Payout Frequency</h3>

              <div className="pf-grid">
                <div className="pf-row">
                  <label className="pf-label" htmlFor="pf-interval">
                    Payout frequency
                  </label>
                  <select
                    id="pf-interval"
                    className="pf-select"
                    value={interval ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInterval(v);
                      if (v !== "weekly") setWeeklyAnchor(null);
                      if (v !== "monthly") setMonthlyAnchor(null);
                    }}>
                    <option value="" disabled>
                      Select payout frequency
                    </option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {interval === "weekly" && (
                  <div className="pf-row">
                    <label className="pf-label" htmlFor="pf-weekday">
                      Weekly anchor
                    </label>
                    <select
                      id="pf-weekday"
                      className="pf-select"
                      value={weekly_anchor ?? ""}
                      onChange={(e) => setWeeklyAnchor(e.target.value.toLowerCase())}>
                      <option value="" disabled>
                        Select weekday…
                      </option>
                      {WEEKDAYS.map((d) => (
                        <option key={d} value={d}>
                          {d.charAt(0).toUpperCase() + d.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {interval === "monthly" && (
                  <div className="pf-row">
                    <label className="pf-label" htmlFor="pf-monthday">
                      Monthly anchor (day)
                    </label>
                    <select
                      id="pf-monthday"
                      className="pf-select"
                      value={monthly_anchor ?? ""}
                      onChange={(e) => setMonthlyAnchor(Number(e.target.value))}>
                      <option value="" disabled>
                        Select day…
                      </option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d} disabled={d > daysInThisMonth}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <small className="pf-note">
                If your scheduled payout date falls on a weekend, a holiday, or a day that doesn't exist in that month,
                your payout will begin the next business day.
              </small>

              {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

              <div className="pf-actions">
                <button className="btn btn-primary" onClick={handlePayoutSchedule}>
                  Save payout schedule
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
