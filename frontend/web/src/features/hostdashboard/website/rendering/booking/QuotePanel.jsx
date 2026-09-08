import React from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";
import GuestCountField from "./GuestCountField";
import BookingRequestForm from "./BookingRequestForm";
import BookingRequestSuccess from "./BookingRequestSuccess";
import { QUOTE_STALE_REASONS, QUOTE_STATUS } from "./useWebsiteQuote";
import { BOOKING_REQUEST_STATUS } from "./useWebsiteBookingRequest";
import { QUOTE_ERROR_SCOPES, resolveQuoteErrorPresentation } from "./quoteErrorCopy";
import {
  BOOKING_REQUEST_ERROR_SCOPES,
  BOOKING_REQUEST_RECOVERY,
  resolveBookingRequestErrorPresentation,
} from "./bookingRequestErrorCopy";
import { EMPTY_BOOKING_GUEST } from "./bookingRequestContact";
import { countStayNights, formatMinorUnits, formatQuoteValidUntil, formatStayDate } from "./quoteSelection";

const IDLE_BOOKING_STATE = Object.freeze({ status: BOOKING_REQUEST_STATUS.IDLE, result: null, error: null });
const noop = () => {};

const pluralizeNights = (count) => `${count} ${count === 1 ? "night" : "nights"}`;

const resolveStaySummary = ({ checkIn, checkOut }) => {
  if (!checkIn) {
    return "Pick a check-in date";
  }
  if (!checkOut) {
    return "Now pick a check-out date";
  }
  return `${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}`;
};

const STALE_NOTICES = Object.freeze({
  [QUOTE_STALE_REASONS.EXPIRED]: "Price expired — check again",
  [QUOTE_STALE_REASONS.REJECTED]: "Price needs re-checking — check again",
});

const resolveStaleNotice = (staleReason) => STALE_NOTICES[staleReason] || "Selection changed — check again";

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
      {!isStale && validUntil ? <p className={styles.validity}>{`Valid until ${validUntil}`}</p> : null}
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

const toAlertPresentation = (bookingPresentation) => ({
  message: bookingPresentation.message,
  canRetry: bookingPresentation.recovery === BOOKING_REQUEST_RECOVERY.RETRY,
  showContact: bookingPresentation.showContact,
  showReference: bookingPresentation.showReference,
});

export default function QuotePanel({
  range,
  guests,
  onGuestsChange,
  capacity = null,
  minimumStay = null,
  quoteState,
  onRequestQuote,
  contactHref = null,
  bookingState = IDLE_BOOKING_STATE,
  guest = EMPTY_BOOKING_GUEST,
  guestErrors = {},
  onGuestChange = noop,
  onSubmitBookingRequest = noop,
}) {
  const checkIn = range?.checkIn || null;
  const checkOut = range?.checkOut || null;
  const nights = countStayNights(checkIn, checkOut);
  const isLoading = quoteState.status === QUOTE_STATUS.LOADING;
  const isStale = quoteState.status === QUOTE_STATUS.STALE;
  const isQuoted = quoteState.status === QUOTE_STATUS.SUCCESS && Boolean(quoteState.quote);
  const showBreakdown = Boolean(quoteState.quote) && (isQuoted || isStale);

  const isSubmitting = bookingState.status === BOOKING_REQUEST_STATUS.SUBMITTING;
  const bookingSucceeded = bookingState.status === BOOKING_REQUEST_STATUS.SUCCESS && Boolean(bookingState.result);

  const errorPresentation =
    quoteState.status === QUOTE_STATUS.ERROR ? resolveQuoteErrorPresentation(quoteState.error) : null;
  const bookingPresentation =
    bookingState.status === BOOKING_REQUEST_STATUS.ERROR
      ? resolveBookingRequestErrorPresentation(bookingState.error)
      : null;

  const datesError =
    (errorPresentation?.scope === QUOTE_ERROR_SCOPES.DATES ? errorPresentation.message : "") ||
    (bookingPresentation?.scope === BOOKING_REQUEST_ERROR_SCOPES.DATES ? bookingPresentation.message : "");
  const guestsError = errorPresentation?.scope === QUOTE_ERROR_SCOPES.GUESTS ? errorPresentation.message : "";
  const panelError = errorPresentation?.scope === QUOTE_ERROR_SCOPES.PANEL ? errorPresentation : null;
  const bookingPanelError =
    bookingPresentation?.scope === BOOKING_REQUEST_ERROR_SCOPES.PANEL ? bookingPresentation : null;
  const bookingQuoteNotice =
    bookingPresentation?.scope === BOOKING_REQUEST_ERROR_SCOPES.QUOTE ? bookingPresentation : null;
  const bookingContactError =
    bookingPresentation?.scope === BOOKING_REQUEST_ERROR_SCOPES.CONTACT ? bookingPresentation.message : "";

  const hideAction = Boolean(panelError?.hideAction || bookingPanelError?.hideAction);
  const canRequestQuote = nights > 0 && guests >= 1 && !isLoading && !isSubmitting;
  const showRequestForm = isQuoted && !hideAction;
  const bookingRequestId = bookingState.error?.requestId || "";

  return (
    <aside className={styles.panel} aria-labelledby="website-quote-panel-title">
      <h3 id="website-quote-panel-title" className={styles.panelTitle}>
        Check availability &amp; price
      </h3>

      <div className={styles.stayBlock}>
        <p className={styles.staySummary}>{resolveStaySummary({ checkIn, checkOut })}</p>
        {nights > 0 ? <p className={styles.stayNights}>{pluralizeNights(nights)}</p> : null}
        {minimumStay > 0 && !bookingSucceeded ? (
          <p className={styles.hint}>{`Minimum stay: ${pluralizeNights(minimumStay)}`}</p>
        ) : null}
        {datesError ? (
          <p className={styles.fieldError} role="alert">
            {datesError}
          </p>
        ) : null}
      </div>

      {bookingSucceeded ? (
        <BookingRequestSuccess result={bookingState.result} guestEmail={guest?.email || ""} />
      ) : (
        <>
          <GuestCountField
            value={guests}
            onChange={onGuestsChange}
            max={capacity}
            disabled={isLoading || isSubmitting}
            errorMessage={guestsError}
          />

          {hideAction ? null : (
            <button type="button" className={styles.action} onClick={onRequestQuote} disabled={!canRequestQuote}>
              {isLoading ? "Checking…" : "Check availability"}
            </button>
          )}

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

          {bookingQuoteNotice ? (
            <div className={styles.notice} role="status">
              <p className={styles.noticeMessage}>{bookingQuoteNotice.message}</p>
              {bookingQuoteNotice.showReference && bookingRequestId ? (
                <p className={styles.reference}>{`Reference: ${bookingRequestId}`}</p>
              ) : null}
            </div>
          ) : null}

          {bookingPanelError ? (
            <QuotePanelAlert
              presentation={toAlertPresentation(bookingPanelError)}
              requestId={bookingRequestId}
              contactHref={contactHref}
              onRetry={onSubmitBookingRequest}
            />
          ) : null}

          {showRequestForm ? (
            <BookingRequestForm
              guest={guest}
              onGuestChange={onGuestChange}
              onSubmit={onSubmitBookingRequest}
              isSubmitting={isSubmitting}
              fieldErrors={guestErrors}
              formError={bookingContactError}
            />
          ) : null}
        </>
      )}
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
  bookingState: PropTypes.shape({
    status: PropTypes.oneOf(Object.values(BOOKING_REQUEST_STATUS)).isRequired,
    result: PropTypes.shape({}),
    error: PropTypes.shape({
      code: PropTypes.string,
      message: PropTypes.string,
      requestId: PropTypes.string,
    }),
  }),
  guest: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  guestErrors: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  onGuestChange: PropTypes.func,
  onSubmitBookingRequest: PropTypes.func,
};
