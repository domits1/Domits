import React from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";
import GuestCountField from "./GuestCountField";
import { QUOTE_STALE_REASONS, QUOTE_STATUS } from "./useWebsiteQuote";
import { QUOTE_ERROR_SCOPES, resolveQuoteErrorPresentation } from "./quoteErrorCopy";
import { countStayNights, formatMinorUnits, formatQuoteValidUntil, formatStayDate } from "./quoteSelection";

const pluralizeNights = (count) => `${count} ${count === 1 ? "night" : "nights"}`;

const resolveStaySummary = ({ checkIn, checkOut }) => {
  if (!checkIn) {
    return "Select your check-in date on the calendar.";
  }
  if (!checkOut) {
    return "Now pick your check-out date on the calendar.";
  }
  return `${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}`;
};

const resolveStaleNotice = (staleReason) =>
  staleReason === QUOTE_STALE_REASONS.EXPIRED
    ? "This price has expired — check again."
    : "Dates or guests changed — check the price again.";

function QuoteBreakdown({ quote, isStale, staleReason }) {
  const { priceBreakdown, nights } = quote;
  const nightlyRate = nights > 0 ? Math.round(priceBreakdown.nightlyBaseTotal / nights) : null;
  const validUntil = formatQuoteValidUntil(quote.expiresAt);

  return (
    <div className={`${styles.breakdown} ${isStale ? styles.breakdownStale : ""}`.trim()} aria-live="polite">
      {isStale ? <p className={styles.staleNotice}>{resolveStaleNotice(staleReason)}</p> : null}
      <dl className={styles.breakdownList}>
        <div className={styles.breakdownRow}>
          <dt>{`${formatMinorUnits(nightlyRate)} × ${pluralizeNights(nights)}`}</dt>
          <dd>{formatMinorUnits(priceBreakdown.nightlyBaseTotal)}</dd>
        </div>
        {priceBreakdown.cleaningFee > 0 ? (
          <div className={styles.breakdownRow}>
            <dt>Cleaning fee</dt>
            <dd>{formatMinorUnits(priceBreakdown.cleaningFee)}</dd>
          </div>
        ) : null}
        <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
          <dt>Total</dt>
          <dd>{formatMinorUnits(priceBreakdown.total)}</dd>
        </div>
      </dl>
      {!isStale && validUntil ? <p className={styles.validity}>{`Price valid until ${validUntil}`}</p> : null}
    </div>
  );
}

QuoteBreakdown.propTypes = {
  quote: PropTypes.shape({
    nights: PropTypes.number.isRequired,
    expiresAt: PropTypes.string,
    priceBreakdown: PropTypes.shape({
      nightlyBaseTotal: PropTypes.number.isRequired,
      cleaningFee: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
  isStale: PropTypes.bool.isRequired,
  staleReason: PropTypes.string,
};

function QuotePanelAlert({ presentation, requestId, contactHref, onRetry }) {
  const showActions = presentation.canRetry || (presentation.showContact && contactHref) || presentation.showReference;

  return (
    <div className={styles.alert} role="alert">
      <p className={styles.alertMessage}>{presentation.message}</p>
      {showActions ? (
        <div className={styles.alertActions}>
          {presentation.canRetry ? (
            <button type="button" className={styles.secondaryAction} onClick={onRetry}>
              Try again
            </button>
          ) : null}
          {presentation.showContact && contactHref ? (
            <a className={styles.contactLink} href={contactHref} target="_blank" rel="noreferrer">
              Contact the host
            </a>
          ) : null}
          {presentation.showReference && requestId ? (
            <p className={styles.reference}>{`Reference: ${requestId}`}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

QuotePanelAlert.propTypes = {
  presentation: PropTypes.shape({
    message: PropTypes.string.isRequired,
    canRetry: PropTypes.bool,
    showContact: PropTypes.bool,
    showReference: PropTypes.bool,
  }).isRequired,
  requestId: PropTypes.string,
  contactHref: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
};

export default function QuotePanel({
  range,
  guests,
  onGuestsChange,
  capacity = null,
  minimumStay = null,
  quoteState,
  onRequestQuote,
  contactHref = null,
}) {
  const checkIn = range?.checkIn || null;
  const checkOut = range?.checkOut || null;
  const nights = countStayNights(checkIn, checkOut);
  const isLoading = quoteState.status === QUOTE_STATUS.LOADING;
  const isStale = quoteState.status === QUOTE_STATUS.STALE;
  const showBreakdown = Boolean(quoteState.quote) && (quoteState.status === QUOTE_STATUS.SUCCESS || isStale);

  const errorPresentation =
    quoteState.status === QUOTE_STATUS.ERROR ? resolveQuoteErrorPresentation(quoteState.error) : null;
  const datesError = errorPresentation?.scope === QUOTE_ERROR_SCOPES.DATES ? errorPresentation.message : "";
  const guestsError = errorPresentation?.scope === QUOTE_ERROR_SCOPES.GUESTS ? errorPresentation.message : "";
  const panelError = errorPresentation?.scope === QUOTE_ERROR_SCOPES.PANEL ? errorPresentation : null;

  const showAction = !panelError?.hideAction;
  const canRequestQuote = nights > 0 && guests >= 1 && !isLoading;

  return (
    <aside className={styles.panel} aria-labelledby="website-quote-panel-title">
      <p className={styles.panelEyebrow}>Live price</p>
      <h3 id="website-quote-panel-title" className={styles.panelTitle}>
        Check availability &amp; price
      </h3>

      <div className={styles.stayBlock}>
        <p className={styles.staySummary}>{resolveStaySummary({ checkIn, checkOut })}</p>
        {nights > 0 ? <p className={styles.stayNights}>{pluralizeNights(nights)}</p> : null}
        {minimumStay > 0 ? <p className={styles.hint}>{`Minimum stay: ${pluralizeNights(minimumStay)}`}</p> : null}
        {datesError ? (
          <p className={styles.fieldError} role="alert">
            {datesError}
          </p>
        ) : null}
      </div>

      <GuestCountField
        value={guests}
        onChange={onGuestsChange}
        max={capacity}
        disabled={isLoading}
        errorMessage={guestsError}
      />

      {showAction ? (
        <button type="button" className={styles.action} onClick={onRequestQuote} disabled={!canRequestQuote}>
          {isLoading ? "Checking…" : "Check availability & price"}
        </button>
      ) : null}

      {panelError ? (
        <QuotePanelAlert
          presentation={panelError}
          requestId={quoteState.error?.requestId || ""}
          contactHref={contactHref}
          onRetry={onRequestQuote}
        />
      ) : null}

      {showBreakdown ? (
        <QuoteBreakdown quote={quoteState.quote} isStale={isStale} staleReason={quoteState.staleReason} />
      ) : null}

      <p className={styles.note}>Live pricing and availability are checked when you request a price.</p>
    </aside>
  );
}

QuotePanel.propTypes = {
  range: PropTypes.shape({
    checkIn: PropTypes.string,
    checkOut: PropTypes.string,
  }).isRequired,
  guests: PropTypes.number.isRequired,
  onGuestsChange: PropTypes.func.isRequired,
  capacity: PropTypes.number,
  minimumStay: PropTypes.number,
  quoteState: PropTypes.shape({
    status: PropTypes.oneOf(Object.values(QUOTE_STATUS)).isRequired,
    quote: PropTypes.shape({}),
    error: PropTypes.shape({
      code: PropTypes.string,
      message: PropTypes.string,
      requestId: PropTypes.string,
    }),
    staleReason: PropTypes.string,
  }).isRequired,
  onRequestQuote: PropTypes.func.isRequired,
  contactHref: PropTypes.string,
};
