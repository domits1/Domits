import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import requestStyles from "./eliteSitePropertyRequest.module.scss";
import quoteStyles from "../../booking/QuoteAvailabilitySection.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import { QuoteBreakdown, QuotePanelAlert, deriveQuoteView } from "../../booking/QuotePanel";
import { QUOTE_STALE_REASONS, QUOTE_STATUS, useWebsiteQuote } from "../../booking/useWebsiteQuote";
import { BOOKING_REQUEST_STATUS, useWebsiteBookingRequest } from "../../booking/useWebsiteBookingRequest";
import { resolveQuoteErrorPresentation } from "../../booking/quoteErrorCopy";
import {
  BOOKING_REQUEST_ERROR_SCOPES as SCOPES,
  BOOKING_REQUEST_RECOVERY as RECOVERY,
  resolveBookingRequestErrorPresentation,
} from "../../booking/bookingRequestErrorCopy";
import { validateBookingGuestContact } from "../../booking/bookingRequestContact";
import { resolveDefaultGuestCount, resolveGuestCapacity, resolveHostContactHref } from "../../booking/quoteModel";
import { formatMinorUnits, formatStayDate } from "../../booking/quoteSelection";
import { getOrCreateVisitorId } from "../../../services/websiteVisitorId";
import { resolveEliteLocation } from "./eliteSitePageContent";

export const SITE_PROPERTY_REQUEST_SENT_TEXT =
  "The host checks your request and replies by email. You have not paid anything.";

const PROPERTY_NOT_FOUND = "property_not_found";
const FIELD_ERROR_CODES = Object.freeze({ invalid_guest_phone: "phone", invalid_guest_message: "message" });
const EMPTY_GUEST = Object.freeze({ name: "", email: "", phone: "", message: "" });
const CONTACT_FIELDS = Object.freeze([
  { field: "name", label: "Your name", type: "text", autoComplete: "name" },
  { field: "email", label: "Email address", type: "email", autoComplete: "email" },
  { field: "phone", label: "Phone (optional)", type: "tel", autoComplete: "tel", maxLength: 32 },
]);
const MESSAGE_FIELD = Object.freeze({
  field: "message",
  label: "Message to the host (optional)",
  as: "textarea",
  rows: 5,
  maxLength: 2000,
  placeholder: "Who is coming, what time you arrive, any questions.",
});

const formatStay = ({ checkIn, checkOut }) => `${formatStayDate(checkIn)} to ${formatStayDate(checkOut)}`;

const renderFacts = (rows) => (
  <dl className={requestStyles.facts}>
    {rows.map(([label, value]) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

const resolveSendError = (error) =>
  error.code === PROPERTY_NOT_FOUND
    ? {
        scope: SCOPES.PANEL,
        message: String(error.message || "").trim() || "This property can no longer be booked on this website.",
        hideAction: true,
        showOtherProperties: true,
      }
    : resolveBookingRequestErrorPresentation(error);

const resolveProblem = ({ booking, hasStay, quoteState, sendError }) => {
  if (!booking) {
    return { message: "Online booking isn't available for this site right now." };
  }
  if (!hasStay) {
    return { message: "Choose your dates on the property page first." };
  }
  if (quoteState.status === QUOTE_STATUS.ERROR) {
    const { code, requestId } = quoteState.error;
    return {
      ...resolveQuoteErrorPresentation(quoteState.error),
      requestId,
      showOtherProperties: code === PROPERTY_NOT_FOUND,
    };
  }
  const stopsSending = sendError?.hideAction || sendError?.scope === SCOPES.DATES;
  return stopsSending ? sendError : null;
};

const toAlert = (presentation) => ({
  ...presentation,
  canRetry: presentation.canRetry ?? presentation.recovery === RECOVERY.RETRY,
});

export default function EliteSitePropertyRequestContent({
  model,
  title,
  booking,
  stay,
  propertyHref,
  overviewHref,
  onSent,
}) {
  const sessionId = useMemo(() => getOrCreateVisitorId(), []);
  const [selection] = useState(() => ({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: stay.guests ?? resolveDefaultGuestCount(resolveGuestCapacity(model)),
  }));
  const hasStay = Boolean(booking && selection.checkIn && selection.checkOut);
  const siteId = booking?.siteId || "";
  const propertyId = booking?.propertyId || "";
  const { requestQuote, markStale, ...quoteState } = useWebsiteQuote({ siteId, sessionId, propertyId });
  const { submitBookingRequest, ...bookingState } = useWebsiteBookingRequest({ siteId, sessionId });
  const [guest, setGuest] = useState(EMPTY_GUEST);
  const [fieldErrors, setFieldErrors] = useState({});
  const isSendingRef = useRef(false);
  const quoteView = deriveQuoteView(quoteState);
  const { quote } = quoteState;
  const quoteStay = useCallback(() => requestQuote(selection), [requestQuote, selection]);

  useEffect(() => {
    if (hasStay) {
      void quoteStay();
    }
  }, [hasStay, quoteStay]);

  const recover = (error) => {
    const field = FIELD_ERROR_CODES[error.code];
    if (field) {
      setFieldErrors({ [field]: String(error.message || "").trim() || "Please check this field." });
      return;
    }
    const { recovery } = resolveSendError(error);
    if (recovery === RECOVERY.REQUOTE) {
      void quoteStay();
    } else if (recovery === RECOVERY.RECHECK) {
      markStale(QUOTE_STALE_REASONS.REJECTED);
    }
  };

  const send = async () => {
    if (isSendingRef.current || !quoteView.isQuoted) {
      return;
    }
    const { guest: contact, errors } = validateBookingGuestContact(guest);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    isSendingRef.current = true;
    const outcome = await submitBookingRequest({
      quote,
      guest: { ...contact, phone: guest.phone.trim() },
      message: guest.message.trim(),
    });
    isSendingRef.current = false;
    if (outcome.ok) {
      onSent();
    } else if (outcome.error) {
      recover(outcome.error);
    }
  };

  const renderField = ({ field, label, as: Control = "input", ...controlProps }) => {
    const id = `site-property-request-${field}`;
    const error = fieldErrors[field];
    return (
      <div key={field} className={quoteStyles.formField}>
        <label htmlFor={id} className={quoteStyles.fieldLabel}>
          {label}
        </label>
        <Control
          {...controlProps}
          id={id}
          className={`${quoteStyles.input} ${error ? quoteStyles.inputInvalid : ""}`.trim()}
          value={guest[field]}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            const { value } = event.target;
            setGuest((currentGuest) => ({ ...currentGuest, [field]: value }));
            setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
          }}
        />
        {error ? (
          <p id={`${id}-error`} className={quoteStyles.fieldError}>
            {error}
          </p>
        ) : null}
      </div>
    );
  };

  if (bookingState.status === BOOKING_REQUEST_STATUS.SUCCESS) {
    const sent = bookingState.result;
    return (
      <div className={`${styles.elitePriceCard} ${requestStyles.sent}`} role="status">
        <span className={styles.eliteFactLabel}>Booking reference</span>
        <p className={requestStyles.sentReference}>{sent.publicBookingRef}</p>
        {renderFacts([
          ["Property", title],
          ["Dates", formatStay(sent)],
          ["Guests", sent.guests],
          ["Total", formatMinorUnits(sent.total, sent.currency)],
        ])}
        <p className={requestStyles.sentText}>{SITE_PROPERTY_REQUEST_SENT_TEXT}</p>
        <PanoramaPageLink href={overviewHref} className={styles.eliteButton}>
          Back to our properties
        </PanoramaPageLink>
      </div>
    );
  }

  const sendErrorCode = bookingState.status === BOOKING_REQUEST_STATUS.ERROR ? bookingState.error.code : "";
  const sendError = sendErrorCode && !FIELD_ERROR_CODES[sendErrorCode] ? resolveSendError(bookingState.error) : null;
  const problem = resolveProblem({ booking, hasStay, quoteState, sendError });
  const isSubmitting = bookingState.status === BOOKING_REQUEST_STATUS.SUBMITTING;
  const alertProps = { requestId: bookingState.error?.requestId || "", contactHref: resolveHostContactHref(model) };
  const location = resolveEliteLocation(model);

  return (
    <div className={`${styles.eliteBookingPanel} ${requestStyles.layout}`}>
      <aside className={`${styles.elitePriceCard} ${requestStyles.summary}`} aria-label="Your stay">
        <div>
          <p className={requestStyles.summaryTitle}>{title}</p>
          {location ? <p className={requestStyles.summaryLocation}>{location}</p> : null}
        </div>
        {quote
          ? renderFacts([
              ["Dates", formatStay(quote)],
              ["Guests", quote.guestCount],
            ])
          : null}
        {quoteView.showBreakdown ? (
          <QuoteBreakdown quote={quote} isStale={quoteView.isStale} staleReason={quoteState.staleReason} />
        ) : null}
        {quoteView.isLoading ? <p className={quoteStyles.hint}>Checking the price…</p> : null}
        {quoteView.isStale ? (
          <button type="button" className={quoteStyles.secondaryAction} onClick={quoteStay}>
            Check the price again
          </button>
        ) : null}
      </aside>
      <div className={requestStyles.main}>
        {problem ? (
          <>
            <QuotePanelAlert
              {...alertProps}
              presentation={toAlert(problem)}
              requestId={problem.requestId || alertProps.requestId}
              onRetry={quoteStay}
            />
            <div className={requestStyles.links}>
              <PanoramaPageLink href={propertyHref} className={styles.eliteButton}>
                {`Back to ${title}`}
              </PanoramaPageLink>
              {problem.showOtherProperties ? (
                <PanoramaPageLink href={overviewHref} className={styles.eliteCrumbLink}>
                  See our other properties
                </PanoramaPageLink>
              ) : null}
            </div>
          </>
        ) : (
          <form
            className={requestStyles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}>
            <div className={requestStyles.fields}>{CONTACT_FIELDS.map(renderField)}</div>
            {renderField(MESSAGE_FIELD)}
            {sendError && sendError.scope !== SCOPES.PANEL ? (
              <p className={`${quoteStyles.notice} ${quoteStyles.noticeMessage}`} role="alert">
                {sendError.message}
              </p>
            ) : null}
            {sendError?.scope === SCOPES.PANEL ? (
              <QuotePanelAlert {...alertProps} presentation={toAlert(sendError)} onRetry={send} />
            ) : null}
            <button
              type="submit"
              className={`${styles.eliteButton} ${requestStyles.sendButton}`}
              disabled={isSubmitting || !quoteView.isQuoted}>
              {isSubmitting ? "Sending…" : "Send request"}
            </button>
            <p className={styles.elitePriceNote}>You don&apos;t pay yet. The host confirms first.</p>
          </form>
        )}
      </div>
    </div>
  );
}

EliteSitePropertyRequestContent.propTypes = {
  model: PropTypes.shape({ stay: PropTypes.object, host: PropTypes.object }).isRequired,
  title: PropTypes.string.isRequired,
  booking: PropTypes.shape({ siteId: PropTypes.string.isRequired, propertyId: PropTypes.string.isRequired }),
  stay: PropTypes.shape({ checkIn: PropTypes.string, checkOut: PropTypes.string, guests: PropTypes.number }).isRequired,
  propertyHref: PropTypes.string.isRequired,
  overviewHref: PropTypes.string.isRequired,
  onSent: PropTypes.func.isRequired,
};
