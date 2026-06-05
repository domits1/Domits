import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { RefreshFunctions } from "../hooks/refreshFunctions.js";
import { pageSlice, MAX_ITEMS_PER_PAGE, getTotalPages } from "../utils/pagination";
import { formatMoney } from "../utils/formatMoney";
import InvoicesSection from "./InvoicesSection";
import { StatusBadge } from "./StatusBadge/StatusBadge";
import { TablePager } from "./TabelPager/TablePager";

const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/";
const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

function FinanceSectionLoader({ message, children }) {
  return (
    <div className="finance-section-loader">
      {children}
      <PulseBarsLoader inline message={message} />
    </div>
  );
}

FinanceSectionLoader.propTypes = {
  message: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function FinanceTableSkeleton({ columns = 4, rows = 4 }) {
  const gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

  return (
    <div className="finance-skeleton-table" aria-hidden="true">
      <div className="finance-skeleton-table__header" style={{ gridTemplateColumns }}>
        {Array.from({ length: columns }, (_, index) => (
          <span key={`header-${index}`} className="finance-skeleton-block finance-skeleton-block--table-cell" />
        ))}
      </div>

      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="finance-skeleton-table__row" style={{ gridTemplateColumns }}>
          {Array.from({ length: columns }, (_, cellIndex) => (
            <span
              key={`row-${rowIndex}-cell-${cellIndex}`}
              className="finance-skeleton-block finance-skeleton-block--table-cell"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

FinanceTableSkeleton.propTypes = {
  columns: PropTypes.number,
  rows: PropTypes.number,
};

function FinanceBalanceSkeleton() {
  return (
    <div className="finance-balance-skeleton" aria-hidden="true">
      <span className="finance-skeleton-block finance-skeleton-block--meter" />

      <div className="finance-balance-skeleton__list">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={`balance-row-${index}`} className="finance-balance-skeleton__row">
            <span className="finance-skeleton-block finance-skeleton-block--label" />
            <span className="finance-skeleton-block finance-skeleton-block--value" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceScheduleSkeleton() {
  return (
    <div className="finance-form-skeleton" aria-hidden="true">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={`schedule-row-${index}`} className="finance-form-skeleton__row">
          <span className="finance-skeleton-block finance-skeleton-block--label" />
          <span className="finance-skeleton-block finance-skeleton-block--input" />
        </div>
      ))}
    </div>
  );
}

function FinanceFaqSkeleton({ items = 3 }) {
  return (
    <div className="faq-skeleton-list" aria-hidden="true">
      {Array.from({ length: items }, (_, index) => (
        <div key={`faq-skeleton-${index}`} className="faq-skeleton-item">
          <span className="finance-skeleton-block finance-skeleton-block--faq-title" />
          <span className="finance-skeleton-block finance-skeleton-block--faq-body" />
          <span className="finance-skeleton-block finance-skeleton-block--faq-body finance-skeleton-block--faq-body-short" />
        </div>
      ))}
    </div>
  );
}

FinanceFaqSkeleton.propTypes = {
  items: PropTypes.number,
};

export default function HostFinanceTab() {
  const navigate = useNavigate();

  const {
    toast,
    payouts,
    charges,
    accountId,
    onboardingComplete,
    chargesEnabled,
    payoutsEnabled,
    isProcessing,
    processingStep,
    payoutInterval,
    weekly_anchor,
    monthly_anchor,
    loadingStates,
    balanceView,
    faqs,

    setPayoutInterval,
    setWeeklyAnchor,
    setMonthlyAnchor,

    handleStripeAction,
    handlePayoutSchedule,
  } = RefreshFunctions();

  const isAccountLoading = Boolean(loadingStates.account);
  const isChargesLoading = Boolean(loadingStates.charges);
  const isBalanceLoading = Boolean(loadingStates.hostBalance);
  const isPayoutsLoading = Boolean(loadingStates.payouts);
  const isPayoutScheduleLoading = Boolean(loadingStates.getPayoutSchedule);
  const isFaqLoading = Boolean(loadingStates.faqs);
  const stripeIssues = !isAccountLoading && onboardingComplete && (!chargesEnabled || !payoutsEnabled);
  const showFinanceSections = onboardingComplete;
  const showFinanceSectionSkeletons = isAccountLoading;

  let stripeAlertMessage = "Payouts are currently disabled on your Stripe account. You will not receive funds.";
  if (!chargesEnabled && !payoutsEnabled) {
    stripeAlertMessage = "Charges and payouts are currently disabled on your Stripe account.";
  } else if (!chargesEnabled) {
    stripeAlertMessage = "Charges are currently disabled on your Stripe account. Guests cannot complete payments.";
  }

  const [chargesPage, setChargesPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);

  const handleNavigation = (value) => navigate(value);

  const chargesTotalPages = getTotalPages(charges.length, MAX_ITEMS_PER_PAGE);
  const payoutsTotalPages = getTotalPages(payouts.length, MAX_ITEMS_PER_PAGE);

  useEffect(() => {
    setChargesPage((page) => Math.min(Math.max(1, page), chargesTotalPages));
  }, [charges.length, chargesTotalPages]);

  useEffect(() => {
    setPayoutsPage((page) => Math.min(Math.max(1, page), payoutsTotalPages));
  }, [payouts.length, payoutsTotalPages]);

  const renderCtaLabel = (idleText) => {
    if (!isProcessing) {
      return idleText;
    }

    if (processingStep === "opening") {
      return "Opening link...";
    }

    return "Working on it...";
  };

  const renderStripeStepContent = () => {
    if (isAccountLoading) {
      return (
        <>
          <strong>Step 2: </strong>
          &nbsp;
          <PulseBarsLoader inline message="Loading Stripe setup..." className="finance-inline-loader" />
        </>
      );
    }

    if (accountId) {
      if (onboardingComplete) {
        return (
          <>
            <strong>Step 2: </strong> &nbsp; You're connected to Stripe. Well done! &nbsp;
            <span
              className={`finance-span ${isProcessing ? "disabled" : ""}`}
              onClick={isProcessing ? undefined : handleStripeAction}
            >
              {renderCtaLabel("Open Stripe Dashboard")}
            </span>
          </>
        );
      }

      return (
        <>
          <strong>Step 2: </strong> &nbsp; Finish your Stripe onboarding to start receiving payouts: &nbsp;
          <span
            className={`finance-span ${isProcessing ? "disabled" : ""}`}
            onClick={isProcessing ? undefined : handleStripeAction}
          >
            {renderCtaLabel("Continue Stripe onboarding")}
          </span>
        </>
      );
    }

    return (
      <>
        <strong>Step 2: </strong> &nbsp; Once your accommodation is created, you can create a Stripe account to
        receive payments: &nbsp;
        <span
          className={`finance-span ${isProcessing ? "disabled" : ""}`}
          onClick={isProcessing ? undefined : handleStripeAction}
        >
          {renderCtaLabel("Create Stripe account")}
        </span>
      </>
    );
  };

  let faqContent = <p>No FAQs found.</p>;
  if (isFaqLoading) {
    faqContent = (
      <FinanceSectionLoader message="Loading FAQs...">
        <FinanceFaqSkeleton />
      </FinanceSectionLoader>
    );
  } else if (faqs.length > 0) {
    faqContent = (
      <ul className="faq-list">
        {faqs.map((faq) => (
          <li key={faq.faq_id} className="faq-item">
            <details className="faq-details">
              <summary className="faq-q">
                <strong>{faq.question}</strong>
              </summary>
              <p className="faq-a">{faq.answer}</p>
            </details>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <main className="page-Host">
      <p className="page-Host-title">Finance</p>
      <div className="page-Host-content">
        <section className="host-pc-finance">
          <div className="finance-content">
            {stripeIssues ? (
              <div className="finance-stripe-alert">
                <strong>Action required: Stripe account issue detected</strong>
                <p>
                  {stripeAlertMessage}{" "}
                  Your listings with direct booking enabled are not accepting new reservations until this is resolved.
                </p>
                <button
                  type="button"
                  className={`finance-span ${isProcessing ? "disabled" : ""}`}
                  onClick={isProcessing ? undefined : handleStripeAction}
                  disabled={isProcessing}
                >
                  {renderCtaLabel("Open Stripe Dashboard to fix")}
                </button>
              </div>
            ) : null}

            <div className="finance-steps">
              <p className="finance-steps-title">Receive your payouts in 3 easy steps</p>
              <ul>
                <li>
                  <strong>Step 1: </strong>
                  &nbsp;&nbsp;
                  <span className="finance-span" onClick={() => handleNavigation("/hostonboarding")}>
                    List your property.
                  </span>
                </li>

                <li>
                  {renderStripeStepContent()}
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

            {(showFinanceSections || showFinanceSectionSkeletons) && (
              <>
                <div className="payouts-section">
                  <h3>Recent guest payments</h3>

                  {isChargesLoading ? (
                    <FinanceSectionLoader message="Loading recent guest payments...">
                      <FinanceTableSkeleton columns={5} rows={4} />
                    </FinanceSectionLoader>
                  ) : charges.length > 0 ? (
                    <>
                      <small className="pf-note">
                        Succeeded charges by guest(s) become available 7 days after the payment date.
                      </small>
                      <br />
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
                            {pageSlice(charges, chargesPage).map((charge, index) => (
                              <tr key={`${charge.createdDate}-${index}-${charge.propertyTitle}`}>
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
                                    <div className="property-sub">Booking id:&nbsp;{charge.bookingId}</div>
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
                  <h3>Withdrawable balance overview</h3>

                  {isBalanceLoading ? (
                    <FinanceSectionLoader message="Loading withdrawable balance...">
                      <FinanceBalanceSkeleton />
                    </FinanceSectionLoader>
                  ) : (
                    <>
                      <div
                        className="balance-meter"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={balanceView.pctAvailable}
                      >
                        <div
                          className="bm-seg bm-seg--available"
                          style={{ width: `${balanceView.pctAvailable}%` }}
                          data-label="Available"
                          data-value={formatMoney(balanceView.availableTotal, balanceView.currency)}
                          data-desc="Funds that have been received and are ready to be paid out"
                        />
                        <div
                          className="bm-seg bm-seg--incoming"
                          style={{
                            width: `${Math.min(100, Math.max(0, (balanceView.incomingTotal / balanceView.total) * 100))}%`,
                          }}
                          data-label="Incoming"
                          data-value={formatMoney(balanceView.incomingTotal, balanceView.currency)}
                          data-desc="Yet to be received funds from bookings that are still within the pending period"
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

                  {isPayoutsLoading ? (
                    <FinanceSectionLoader message="Loading recent payouts...">
                      <FinanceTableSkeleton columns={4} rows={4} />
                    </FinanceSectionLoader>
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

                  {isPayoutScheduleLoading ? (
                    <FinanceSectionLoader message="Loading payout schedule...">
                      <FinanceScheduleSkeleton />
                    </FinanceSectionLoader>
                  ) : (
                    <>
                      <div className="pf-grid">
                        <div className="pf-row">
                          <label className="pf-label" htmlFor="pf-interval">
                            Payout frequency
                          </label>
                          <select
                            id="pf-interval"
                            className="pf-select"
                            value={payoutInterval ?? ""}
                            onChange={(event) => {
                              const period = event.target.value;
                              setPayoutInterval(period);
                              if (period !== "weekly") setWeeklyAnchor(null);
                              if (period !== "monthly") setMonthlyAnchor(null);
                            }}
                          >
                            <option value="" disabled>
                              Select payout frequency
                            </option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        {payoutInterval === "weekly" && (
                          <div className="pf-row">
                            <label className="pf-label" htmlFor="pf-weekday">
                              Weekly anchor
                            </label>
                            <select
                              id="pf-weekday"
                              className="pf-select"
                              value={weekly_anchor ?? ""}
                              onChange={(event) => setWeeklyAnchor(event.target.value.toLowerCase())}
                            >
                              <option value="" disabled>
                                Select weekday...
                              </option>
                              {WEEKDAYS.map((day) => (
                                <option key={day} value={day}>
                                  {day.charAt(0).toUpperCase() + day.slice(1)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {payoutInterval === "monthly" && (
                          <div className="pf-row">
                            <label className="pf-label" htmlFor="pf-monthday">
                              Monthly anchor (day)
                            </label>
                            <select
                              id="pf-monthday"
                              className="pf-select"
                              value={monthly_anchor ?? ""}
                              onChange={(event) => setMonthlyAnchor(Number(event.target.value))}
                            >
                              <option value="" disabled>
                                Select day...
                              </option>
                              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                                <option key={day} value={day}>
                                  {day}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <small className="pf-note">
                        If your scheduled payout date falls on a weekend, a holiday, or a day that does not exist in
                        that month, your payout will begin the next business day.
                      </small>

                      {toast ? <div className={`toast ${toast.type}`}>{toast.message}</div> : null}

                      <div className="pf-actions">
                        <button type="button" className="btn btn-primary" onClick={handlePayoutSchedule}>
                          Save payout schedule
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            <InvoicesSection />
          </div>
        </section>

        <div className="faqs">
          <p className="faqs-title">FAQs</p>

          {faqContent}
        </div>
      </div>
    </main>
  );
}
