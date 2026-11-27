import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import requestStyles from "./eliteSitePropertyRequest.module.scss";
import quoteStyles from "../../booking/QuoteAvailabilitySection.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import BookingRequestForm from "../../booking/BookingRequestForm";
import BookingRequestSuccess from "../../booking/BookingRequestSuccess";
import EliteSitePropertyBookingPanel from "./EliteSitePropertyBookingPanel";
import { QuoteBreakdown, QuotePanelAlert, deriveQuoteView } from "../../booking/QuotePanel";
import { QUOTE_STALE_REASONS, QUOTE_STATUS, useWebsiteQuote } from "../../booking/useWebsiteQuote";
import { BOOKING_REQUEST_STATUS, useWebsiteBookingRequest } from "../../booking/useWebsiteBookingRequest";
import {
  BOOKING_REQUEST_ERROR_SCOPES as SCOPES,
  BOOKING_REQUEST_RECOVERY as RECOVERY,
  resolveBookingRequestErrorPresentation,
} from "../../booking/bookingRequestErrorCopy";
import { EMPTY_BOOKING_GUEST, validateBookingGuestContact } from "../../booking/bookingRequestContact";
import { resolveDefaultGuestCount, resolveGuestCapacity, resolveHostContactHref } from "../../booking/quoteModel";
import { formatStayDate } from "../../booking/quoteSelection";
import { getOrCreateVisitorId } from "../../../services/websiteVisitorId";
import { hasEliteHeaderPhoto, resolveEliteLocation } from "./eliteSitePageContent";

const CHOOSE_DATES_TEXT = "Choose your dates to request this stay.";

const toAlert = (presentation) => ({
  ...presentation,
  canRetry: presentation.canRetry ?? presentation.recovery === RECOVERY.RETRY,
});

const readIdempotencyScope = (booking, quote) =>
  [booking.propertyId || "main", quote.checkIn, quote.checkOut, quote.guestCount].join(" ");

const recoverFromSendError = (error, { onDatesTaken, onRequote, onRecheck }) => {
  const presentation = resolveBookingRequestErrorPresentation(error);
  if (presentation.scope === SCOPES.DATES) {
    onDatesTaken(presentation.message);
  } else if (presentation.recovery === RECOVERY.REQUOTE) {
    onRequote();
  } else if (presentation.recovery === RECOVERY.RECHECK) {
    onRecheck();
  }
};

function RequestStaySummary({ model, title, selection, quoteState, quoteView, propertyHref, onCheckAgain }) {
  const location = resolveEliteLocation(model);
  const photo = hasEliteHeaderPhoto(model.media) ? model.media.heroImage : "";

  return (
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
        <QuoteBreakdown quote={quoteState.quote} isStale={quoteView.isStale} staleReason={quoteState.staleReason} />
      ) : null}
      {quoteView.isLoading ? <p className={quoteStyles.hint}>Checking the price…</p> : null}
      {quoteView.isStale ? (
        <button type="button" className={quoteStyles.secondaryAction} onClick={onCheckAgain}>
          Check the price again
        </button>
      ) : null}
      <PanoramaPageLink href={propertyHref} className={styles.eliteCrumbLink}>
        Change dates or guests
      </PanoramaPageLink>
    </aside>
  );
}

RequestStaySummary.propTypes = {
  model: PropTypes.shape({ media: PropTypes.object }).isRequired,
  title: PropTypes.string.isRequired,
  selection: PropTypes.object.isRequired,
  quoteState: PropTypes.object.isRequired,
  quoteView: PropTypes.object.isRequired,
  propertyHref: PropTypes.string.isRequired,
  onCheckAgain: PropTypes.func.isRequired,
};

export default function EliteSitePropertyRequestContent({
  model,
  title,
  booking,
  stay,
  propertyHref,
  overviewHref,
  buildRequestHref,
}) {
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
  const [guest, setGuest] = useState(EMPTY_BOOKING_GUEST);
  const [guestErrors, setGuestErrors] = useState({});
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
    const { guest: contact, errors } = validateBookingGuestContact(guest);
    setGuestErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    isSendingRef.current = true;
    const outcome = await submitBookingRequest({
      quote,
      guest: contact,
      idempotencyScope: readIdempotencyScope(booking, quote),
    });
    isSendingRef.current = false;
    if (outcome?.error) {
      recoverFromSendError(outcome.error, {
        onDatesTaken: setDatesProblem,
        onRequote: () => void quoteStay(),
        onRecheck: () => markStale(QUOTE_STALE_REASONS.REJECTED),
      });
    }
  };

  if (bookingState.status === BOOKING_REQUEST_STATUS.SUCCESS) {
    return <BookingRequestSuccess result={bookingState.result} />;
  }

  const contactHref = resolveHostContactHref(model);
  const needsOtherDates = !hasStay || datesProblem || quoteView.datesError || quoteView.guestsError;
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
          requestId={quoteState.error?.requestId}
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

  const sendError =
    bookingState.status === BOOKING_REQUEST_STATUS.ERROR
      ? resolveBookingRequestErrorPresentation(bookingState.error)
      : null;

  return (
    <div className={requestStyles.layout}>
      <RequestStaySummary
        model={model}
        title={title}
        selection={selection}
        quoteState={quoteState}
        quoteView={quoteView}
        propertyHref={propertyHref}
        onCheckAgain={quoteStay}
      />
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
            requestId={bookingState.error?.requestId}
            contactHref={contactHref}
            onRetry={send}
          />
        ) : null}
        {sendError?.hideAction ? null : (
          <BookingRequestForm
            guest={guest}
            onGuestChange={(field, value) => {
              setGuest((currentGuest) => ({ ...currentGuest, [field]: value }));
              setGuestErrors((currentErrors) => ({ ...currentErrors, [field]: "" }));
            }}
            onSubmit={send}
            isSubmitting={bookingState.status === BOOKING_REQUEST_STATUS.SUBMITTING}
            fieldErrors={guestErrors}
            formError={sendError?.scope === SCOPES.CONTACT ? sendError.message : ""}
          />
        )}
      </div>
    </div>
  );
}

EliteSitePropertyRequestContent.propTypes = {
  model: PropTypes.shape({ stay: PropTypes.object, host: PropTypes.object, media: PropTypes.object }).isRequired,
  title: PropTypes.string.isRequired,
  booking: PropTypes.shape({ siteId: PropTypes.string.isRequired, propertyId: PropTypes.string.isRequired }).isRequired,
  stay: PropTypes.shape({ checkIn: PropTypes.string, checkOut: PropTypes.string, guests: PropTypes.number }).isRequired,
  propertyHref: PropTypes.string.isRequired,
  overviewHref: PropTypes.string.isRequired,
  buildRequestHref: PropTypes.func.isRequired,
};
