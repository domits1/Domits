import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import styles from "./eliteSitePage.module.scss";
import requestStyles from "./eliteSitePropertyRequest.module.scss";
import quoteStyles from "../../booking/QuoteAvailabilitySection.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import EliteSitePropertyRequestForm from "./EliteSitePropertyRequestForm";
import EliteSitePropertyBookingPanel from "./EliteSitePropertyBookingPanel";
import { QuoteBreakdown, QuotePanelAlert, deriveQuoteView } from "../../booking/QuotePanel";
import { QUOTE_STALE_REASONS, QUOTE_STATUS, useWebsiteQuote } from "../../booking/useWebsiteQuote";
import { BOOKING_REQUEST_STATUS, useWebsiteBookingRequest } from "../../booking/useWebsiteBookingRequest";
import {
  BOOKING_REQUEST_ERROR_SCOPES as SCOPES,
  BOOKING_REQUEST_RECOVERY as RECOVERY,
  resolveBookingRequestErrorPresentation,
} from "../../booking/bookingRequestErrorCopy";
import {
  EMPTY_REQUEST_DETAILS,
  REQUEST_DETAIL_MESSAGES,
  validateRequestDetails,
} from "./eliteSitePropertyRequestDetails";
import { resolveDefaultGuestCount, resolveGuestCapacity, resolveHostContactHref } from "../../booking/quoteModel";
import { formatStayDate } from "../../booking/quoteSelection";
import { getOrCreateVisitorId } from "../../../services/websiteVisitorId";
import { hasEliteHeaderPhoto, listEliteHouseRules, resolveEliteLocation } from "./eliteSitePageContent";

const CHOOSE_DATES_TEXT = "Choose your dates to request this stay.";
const REQUEST_STEPS = Object.freeze(["Your details", "Host confirms", "You pay"]);
const FIELD_BY_ERROR_CODE = Object.freeze({ invalid_guest_phone: "phone", invalid_guest_message: "message" });

const toAlert = (presentation) => ({
  ...presentation,
  canRetry: presentation.canRetry ?? presentation.recovery === RECOVERY.RETRY,
});

const readIdempotencyScope = (booking, quote) =>
  [booking.propertyId || "main", quote.checkIn, quote.checkOut, quote.guestCount].join(" ");

export default function EliteSitePropertyRequestContent({
  model,
  title,
  booking,
  stay,
  propertyHref,
  overviewHref,
  sentHref,
  buildRequestHref,
}) {
  const navigate = useNavigate();
  const sessionId = useMemo(() => getOrCreateVisitorId(), []);
  const [selection] = useState(() => ({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    guests: stay.guests ?? resolveDefaultGuestCount(resolveGuestCapacity(model)),
  }));
  const hasStay = Boolean(selection.checkIn && selection.checkOut);
  const { siteId, propertyId } = booking;
  const { requestQuote, markStale, ...quoteState } = useWebsiteQuote({ siteId, sessionId, propertyId });
  const { submitBookingRequest, ...bookingState } = useWebsiteBookingRequest({ siteId, sessionId });
  const [details, setDetails] = useState(EMPTY_REQUEST_DETAILS);
  const [fieldErrors, setFieldErrors] = useState({});
  const houseRules = useMemo(() => listEliteHouseRules(model.policies).map((rule) => rule.label), [model.policies]);
  const [datesProblem, setDatesProblem] = useState("");
  const isSendingRef = useRef(false);
  const quoteView = deriveQuoteView(quoteState);
  const { quote } = quoteState;
  const quoteStay = useCallback(() => requestQuote(selection), [requestQuote, selection]);

  useEffect(() => {
    if (hasStay) {
      void quoteStay();
    }
  }, [hasStay, quoteStay]);

  const send = async () => {
    if (quoteState.status === QUOTE_STATUS.STALE) {
      void quoteStay();
    }
    if (isSendingRef.current || quoteState.status !== QUOTE_STATUS.SUCCESS) {
      return;
    }
    const { guest, message, errors } = validateRequestDetails(details, { hasHouseRules: houseRules.length > 0 });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    isSendingRef.current = true;
    const outcome = await submitBookingRequest({
      quote,
      guest,
      message,
      idempotencyScope: readIdempotencyScope(booking, quote),
    });
    isSendingRef.current = false;
    if (outcome?.ok) {
      const { publicBookingRef, checkIn, checkOut } = outcome.result;
      navigate(sentHref, { replace: true, state: { sentRequest: { reference: publicBookingRef, checkIn, checkOut } } });
      return;
    }
    const field = FIELD_BY_ERROR_CODE[outcome?.error?.code];
    if (field) {
      setFieldErrors({ [field]: outcome.error.message || REQUEST_DETAIL_MESSAGES[field] });
      return;
    }
    const presentation = outcome?.error ? resolveBookingRequestErrorPresentation(outcome.error) : null;
    if (presentation?.scope === SCOPES.DATES) {
      setDatesProblem(presentation.message);
    } else if (presentation?.recovery === RECOVERY.REQUOTE) {
      void quoteStay();
    } else if (presentation?.recovery === RECOVERY.RECHECK) {
      markStale(QUOTE_STALE_REASONS.REJECTED);
    }
  };

  if (bookingState.status === BOOKING_REQUEST_STATUS.SUCCESS) {
    return null;
  }

  const contactHref = resolveHostContactHref(model);
  const needsOtherDates = !hasStay || Boolean(datesProblem) || Boolean(quoteView.datesError || quoteView.guestsError);
  if (needsOtherDates) {
    return (
      <div className={requestStyles.choose}>
        <p className={requestStyles.chooseText} role={datesProblem ? "alert" : undefined}>
          {datesProblem || CHOOSE_DATES_TEXT}
        </p>
        <EliteSitePropertyBookingPanel
          model={model}
          siteId={siteId}
          propertyId={propertyId}
          initialStay={datesProblem ? { checkIn: null, checkOut: null, guests: selection.guests } : stay}
          buildRequestHref={buildRequestHref}
        />
      </div>
    );
  }

  if (quoteView.panelError) {
    return (
      <div className={requestStyles.main}>
        <QuotePanelAlert
          presentation={quoteView.panelError}
          requestId={quoteState.error?.requestId || ""}
          contactHref={contactHref}
          onRetry={quoteStay}
        />
        <div className={requestStyles.links}>
          <PanoramaPageLink href={propertyHref} className={styles.eliteButton}>
            {`Back to ${title}`}
          </PanoramaPageLink>
          <PanoramaPageLink href={overviewHref} className={styles.eliteCrumbLink}>
            See our other properties
          </PanoramaPageLink>
        </div>
      </div>
    );
  }

  const isSendError =
    bookingState.status === BOOKING_REQUEST_STATUS.ERROR && !FIELD_BY_ERROR_CODE[bookingState.error.code];
  const sendError = isSendError ? resolveBookingRequestErrorPresentation(bookingState.error) : null;
  const location = resolveEliteLocation(model);
  const photo = hasEliteHeaderPhoto(model.media) ? model.media.heroImage : "";

  return (
    <div className={requestStyles.layout}>
      <ol className={requestStyles.steps} aria-label="How booking works">
        {REQUEST_STEPS.map((step, index) => (
          <li key={step} aria-current={index === 0 ? "step" : undefined}>
            <span className={requestStyles.stepNumber}>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <aside className={styles.elitePriceCard} aria-label="Your stay">
        {photo ? <img className={requestStyles.summaryPhoto} src={photo} alt={title} /> : null}
        <div>
          <p className={requestStyles.summaryTitle}>{title}</p>
          {location ? <p className={requestStyles.summaryLocation}>{location}</p> : null}
        </div>
        <dl className={requestStyles.facts}>
          <div>
            <dt>Dates</dt>
            <dd>{`${formatStayDate(selection.checkIn)} to ${formatStayDate(selection.checkOut)}`}</dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>{selection.guests}</dd>
          </div>
        </dl>
        {quoteView.showBreakdown ? (
          <QuoteBreakdown quote={quote} isStale={quoteView.isStale} staleReason={quoteState.staleReason} />
        ) : null}
        {quoteView.isLoading ? <p className={quoteStyles.hint}>Checking the price…</p> : null}
        {quoteView.isStale ? (
          <button type="button" className={quoteStyles.secondaryAction} onClick={quoteStay}>
            Check the price again
          </button>
        ) : null}
        <PanoramaPageLink href={propertyHref} className={styles.eliteCrumbLink}>
          Change dates or guests
        </PanoramaPageLink>
      </aside>
      <div className={requestStyles.main}>
        <h2 className={requestStyles.heading}>Your details</h2>
        {sendError?.scope === SCOPES.QUOTE ? (
          <p className={`${quoteStyles.notice} ${quoteStyles.noticeMessage}`} role="status">
            {sendError.message}
          </p>
        ) : null}
        {sendError?.scope === SCOPES.PANEL ? (
          <QuotePanelAlert
            presentation={toAlert(sendError)}
            requestId={bookingState.error?.requestId || ""}
            contactHref={contactHref}
            onRetry={send}
          />
        ) : null}
        {sendError?.hideAction ? null : (
          <EliteSitePropertyRequestForm
            details={details}
            onChange={(field, value) => {
              setDetails((currentDetails) => ({ ...currentDetails, [field]: value }));
              setFieldErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
            }}
            onSubmit={send}
            houseRules={houseRules}
            isSubmitting={bookingState.status === BOOKING_REQUEST_STATUS.SUBMITTING}
            fieldErrors={fieldErrors}
            formError={sendError?.scope === SCOPES.CONTACT ? sendError.message : ""}
          />
        )}
      </div>
    </div>
  );
}

EliteSitePropertyRequestContent.propTypes = {
  model: PropTypes.shape({
    stay: PropTypes.object,
    host: PropTypes.object,
    media: PropTypes.object,
    policies: PropTypes.object,
  }).isRequired,
  title: PropTypes.string.isRequired,
  booking: PropTypes.shape({ siteId: PropTypes.string.isRequired, propertyId: PropTypes.string.isRequired }).isRequired,
  stay: PropTypes.shape({ checkIn: PropTypes.string, checkOut: PropTypes.string, guests: PropTypes.number }).isRequired,
  propertyHref: PropTypes.string.isRequired,
  overviewHref: PropTypes.string.isRequired,
  sentHref: PropTypes.string.isRequired,
  buildRequestHref: PropTypes.func.isRequired,
};
