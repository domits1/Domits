import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  Info,
  WalletCards,
} from "lucide-react";
import InvoicesSection from "./InvoicesSection";
import { RefreshFunctions } from "../hooks/refreshFunctions.js";
import { formatMoney } from "../utils/formatMoney";
import { fetchHostOwnedListings } from "../../services/hostTaskPropertyService";
import { isFinanceDemoMode } from "../mocks/financeDemoData";

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
};

const getAmount = (value, currency) => formatMoney(Number(value || 0), currency || "EUR");

function Step({ number, label, complete, active }) {
  return (
    <div className={`finance-step${complete ? " is-complete" : ""}${active ? " is-active" : ""}`}>
      {complete ? <CheckCircle2 size={14} aria-hidden="true" /> : <span className="finance-step-number">{number}</span>}
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="finance-empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function HelpPanel() {
  const questions = [
    ["When will I be paid?", "Payment timelines are currently under discussion, but typically, payments will be processed shortly after the guest checks in. Exact details will be provided in your Stripe account once finalized."],
    ["How do payouts work?", "Payments for your bookings will be deposited into your linked Stripe account. From there, Stripe will transfer the funds to your bank account or connected wallet within a week."],
    ["Why do I have to share my details with Stripe?", "Stripe requires your details to verify your identity and ensure secure payment processing. This verification helps protect both hosts and guests."],
  ];

  return (
    <section className="finance-card finance-help-card">
      <h2>Need help?</h2>
      {questions.map(([question, answer]) => (
        <details key={question} className="finance-help-item">
          <summary>
            {question}
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}

export default function HostFinanceTab() {
  const navigate = useNavigate();
  const [listingState, setListingState] = useState({ hasProperty: false, isLive: false, loading: true });
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [showAllPayouts, setShowAllPayouts] = useState(false);
  const {
    toast,
    payouts,
    charges,
    accountId,
    onboardingComplete,
    isProcessing,
    processingStep,
    payoutInterval,
    weekly_anchor,
    monthly_anchor,
    loadingStates,
    balanceView,
    setPayoutInterval,
    setWeeklyAnchor,
    setMonthlyAnchor,
    handleStripeAction,
    handlePayoutSchedule,
  } = RefreshFunctions();

  const isAccountLoading = Boolean(loadingStates.account);
  const isBalanceLoading = Boolean(loadingStates.hostBalance);
  const isPayoutScheduleLoading = Boolean(loadingStates.getPayoutSchedule);
  const isConnected = Boolean(accountId && onboardingComplete);
  const demoMode = isFinanceDemoMode();
  const hasProperty = listingState.hasProperty;
  const hasActivity = charges.length > 0 || payouts.length > 0 || balanceView.total > 0;
  const isLive = isConnected && listingState.isLive;
  const showFinancialData = isLive || (demoMode && hasActivity);
  const currency = balanceView.currency || "EUR";

  const recentPayouts = useMemo(() => payouts.slice(0, 3), [payouts]);
  const displayedPayouts = showAllPayouts ? payouts : recentPayouts;
  const transactions = useMemo(
    () => [
      ...charges.map((charge, index) => {
        const searchText = `${charge.description || ""} ${charge.status || ""}`.toLowerCase();
        return {
          id: `charge-${charge.paymentId || index}`,
          type: searchText.includes("refund") ? "refunds" : "payments",
          date: charge.createdDate,
          description: charge.description || "Guest payment",
          channel: charge.channel || charge.paymentMethod || "Stripe",
          amount: charge.hostReceives,
          currency: charge.currency || currency,
          status: charge.status,
        };
      }),
      ...payouts.map((payout, index) => ({
        id: `payout-${payout.id || index}`,
        type: "payouts",
        date: payout.arrivalDate,
        description: payout.status === "paid" ? "Payout to bank account" : "Upcoming payout",
        channel: "Stripe",
        amount: payout.amount,
        currency: payout.currency || currency,
        status: payout.status,
      })),
    ],
    [charges, currency, payouts]
  );
  const filteredTransactions =
    transactionFilter === "all" ? transactions : transactions.filter((transaction) => transaction.type === transactionFilter);

  useEffect(() => {
    let isCancelled = false;
    fetchHostOwnedListings()
      .then((listings) => {
        if (isCancelled) return;
        setListingState({
          hasProperty: listings.length > 0,
          isLive: listings.some(
            (listing) => String(listing?.property?.status || "").toUpperCase() === "ACTIVE"
          ),
          loading: false,
        });
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error("Error fetching host listings for finance status:", error);
        setListingState({ hasProperty: false, isLive: false, loading: false });
      });

    return () => {
      isCancelled = true;
    };
  }, [demoMode]);

  const ctaLabel = () => {
    if (!isProcessing) {
      if (!hasProperty) return "List your property";
      if (!isConnected) return "Connect Stripe";
      return isLive ? "Withdraw Funds" : "Go live";
    }
    return processingStep === "opening" ? "Opening link..." : "Working on it...";
  };

  const handlePrimaryAction = () => {
    if (!hasProperty) {
      navigate("/hostonboarding");
      return;
    }
    if (!isConnected) {
      handleStripeAction();
      return;
    }
    if (!isLive) {
      navigate("/hostdashboard/listings");
      return;
    }
    handleStripeAction();
  };

  const handleExportTransactions = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ["Date", "Description", "Channel", "Amount", "Currency", "Status"];
    const rows = filteredTransactions.map((transaction) => [
      transaction.date,
      transaction.description,
      transaction.channel,
      transaction.amount,
      transaction.currency,
      transaction.status,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `domits-transactions-${transactionFilter}.csv`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const scrollToPayoutSettings = () => {
    document.getElementById("finance-payout-settings")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const nextPayout = recentPayouts[0];
  const processingAmount = balanceView.incomingTotal;
  const availableAmount = balanceView.availableTotal;

  let statusTitle = "You are almost there";

  if (!hasProperty) {
    statusTitle = "List your property to get started";
  } else if (!isConnected) {
    statusTitle = "Securely connect your account to receive payouts";
  }

  return (
    <main className="page-Host finance-page">
      <div className="finance-page-heading">
        <h1>Finance</h1>
        <p>Manage your earnings, payouts, and cashflow.</p>
      </div>

      <section className={`finance-status-card${isLive ? " is-live" : ""}`}>
        {isLive ? (
          <div className="finance-live-summary">
            <div className="finance-live-icon"><WalletCards size={24} aria-hidden="true" /></div>
            <div>
              <strong>Ready to withdraw</strong>
              <b>{getAmount(availableAmount, currency)}</b>
              <small>
                {getAmount(processingAmount, currency)} arriving soon <Info size={11} aria-hidden="true" />{" "}
                <span>•</span> {getAmount(processingAmount, currency)} processing <Info size={11} aria-hidden="true" />
              </small>
            </div>
            <button type="button" className="finance-button" onClick={handleStripeAction} disabled={isProcessing}>
              {ctaLabel()}
            </button>
            <div className="finance-live-meta">
              <span><CalendarDays size={13} aria-hidden="true" /> Next payout: {nextPayout?.arrivalDate || "Scheduled"}</span>
              <span><CalendarDays size={13} aria-hidden="true" /> Last payout: {recentPayouts[1]?.arrivalDate || "No previous payout"}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="finance-steps">
              <Step number="1" label="List your property" complete={hasProperty} active={!hasProperty} />
              <span className="finance-step-divider" />
              <Step number="2" label="Connect Stripe" complete={isConnected} active={hasProperty && !isConnected} />
              <span className="finance-step-divider" />
              <Step number="3" label="Go live" complete={isLive} active={isConnected && hasProperty && !isLive} />
            </div>
            <div className="finance-status-content">
              <div>
                <strong>{statusTitle}</strong>
                {!hasProperty ? (
                  <p>Add your property details before connecting Stripe and making it visible to guests.</p>
                ) : !isConnected ? (
                  <ul>
                    <li>Takes 2–3 minutes</li>
                    <li>You&apos;ll be redirected to Stripe</li>
                    <li>Your data is secure and encrypted</li>
                  </ul>
                ) : (
                  <p>Make your property visible to guests and start to<br />receive bookings.</p>
                )}
              </div>
              <button type="button" className="finance-button" onClick={handlePrimaryAction} disabled={isProcessing || isAccountLoading || listingState.loading}>
                {ctaLabel()}
              </button>
            </div>
          </>
        )}
      </section>

      <section className="finance-section">
        <h2>Balance Details</h2>
        <div className="finance-balance-grid">
          <div className="finance-balance-card">
            <CircleDollarSign size={24} aria-hidden="true" />
            <div><b>{isBalanceLoading ? "—" : getAmount(showFinancialData ? availableAmount : 0, currency)}</b><span>Next payout</span></div>
            {showFinancialData && <small>{nextPayout?.arrivalDate || "Scheduled"}</small>}
          </div>
          <div className="finance-balance-card">
            <WalletCards size={24} aria-hidden="true" />
            <div><b>{isBalanceLoading ? "—" : getAmount(showFinancialData ? processingAmount : 0, currency)}</b><span>Arriving soon</span></div>
            {showFinancialData && <small>1–3 days</small>}
          </div>
          <div className="finance-balance-card">
            <Building2 size={24} aria-hidden="true" />
            <div><b>{isBalanceLoading ? "—" : getAmount(showFinancialData ? processingAmount : 0, currency)}</b><span>Processing</span></div>
            {showFinancialData && <small>Pending confirmation</small>}
          </div>
        </div>
      </section>

      <div className="finance-main-grid">
        <div className="finance-main-column">
          <section className="finance-section">
            <div className="finance-section-title">
              <h2>Upcoming Payouts</h2>
              {showFinancialData && payouts.length > 0 && (
                <button
                  type="button"
                  className={`finance-section-action${showAllPayouts ? " is-expanded" : ""}`}
                  onClick={() => setShowAllPayouts((expanded) => !expanded)}
                  aria-label={showAllPayouts ? "Show fewer payouts" : "Show all payouts"}
                  aria-expanded={showAllPayouts}
                >
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="finance-card finance-payouts-card">
              {!showFinancialData || recentPayouts.length === 0 ? (
                <EmptyState title="No upcoming payouts" description="Payouts will appear here once you receive bookings." />
              ) : (
                displayedPayouts.map((payout, index) => (
                  <div className="finance-payout-row" key={payout.id || `${payout.arrivalDate}-${index}`}>
                    <div><span>{formatDate(payout.arrivalDate) || "Upcoming payout"}</span><small>{payout.status || "In 2 days"}</small></div>
                    <b>{getAmount(payout.amount, payout.currency || currency)}</b>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="finance-section finance-transactions-section">
            <div className="finance-section-title">
              <h2>Transactions</h2>
              {showFinancialData && (
                <button
                  type="button"
                  className="finance-export-button"
                  onClick={handleExportTransactions}
                  disabled={filteredTransactions.length === 0}
                >
                  <Download size={12} aria-hidden="true" /> Export
                </button>
              )}
            </div>
            {!showFinancialData ? (
              <div className="finance-card"><EmptyState title="No transactions yet" description="Your earnings and payouts will appear here once your property is live." /></div>
            ) : (
              <div className="finance-card finance-transactions-card">
                <div className="finance-tabs">
                  {[
                    ["all", "All"],
                    ["payments", "Payments"],
                    ["payouts", "Payouts"],
                    ["refunds", "Refunds"],
                  ].map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      className={transactionFilter === filter ? "is-selected" : ""}
                      onClick={() => setTransactionFilter(filter)}
                      aria-pressed={transactionFilter === filter}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {filteredTransactions.length === 0 ? <EmptyState title="No transactions yet" description="Your transactions will appear here." /> : (
                  <div className="finance-transaction-table">
                    <div className="finance-transaction-head"><span>Date</span><span>Description</span><span>Channel</span><span>Amount</span></div>
                    {filteredTransactions.map((transaction) => (
                      <div className="finance-transaction-row" key={transaction.id}>
                        <span>{transaction.date || "—"}</span><span>{transaction.description}</span><span>{transaction.channel}</span><span>{getAmount(transaction.amount, transaction.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="finance-side-column">
          {isLive && (
            <section className="finance-card finance-receive-card">
              <button type="button" className="finance-card-action" onClick={scrollToPayoutSettings}>
                <h2>Receive payouts in 3 steps <ArrowRight size={16} aria-hidden="true" /></h2>
                <p>You are all set! Updates will appear here if changes are needed.</p>
              </button>
            </section>
          )}
          <section id="finance-payout-settings" className="finance-card finance-settings-card">
            <h2>Payout Settings</h2>
            <div className={`finance-stripe-status${isConnected ? " is-connected" : ""}`}>
              {isConnected ? <><CheckCircle2 size={14} aria-hidden="true" /> Stripe Connected</> : "Connect Stripe to enable payouts"}
            </div>
            <p>{isConnected ? "Bank account connected and ready for payouts." : "You will be able to set your bank account and payout schedule after connecting."}</p>
            <button type="button" className="finance-outline-button" onClick={handleStripeAction} disabled={!isConnected || isProcessing}>{isConnected ? "Manage account" : "Connect Stripe"}</button>
            <label htmlFor="finance-payout-frequency">Payout frequency</label>
            <select id="finance-payout-frequency" value={payoutInterval || "daily"} onChange={(event) => setPayoutInterval(event.target.value)} disabled={!isConnected || isPayoutScheduleLoading}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
            {payoutInterval === "weekly" && <select value={weekly_anchor || ""} onChange={(event) => setWeeklyAnchor(event.target.value)}><option value="">Select weekday</option>{WEEKDAYS.map((day) => <option key={day} value={day}>{day}</option>)}</select>}
            {payoutInterval === "monthly" && <select value={monthly_anchor || ""} onChange={(event) => setMonthlyAnchor(Number(event.target.value))}><option value="">Select day</option>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select>}
            {isConnected && <button type="button" className="finance-save-button" onClick={handlePayoutSchedule}>Save schedule</button>}
            {toast && <small className={`finance-toast ${toast.type}`}>{toast.message}</small>}
          </section>
          <HelpPanel />
        </aside>
      </div>

      <InvoicesSection />
    </main>
  );
}
