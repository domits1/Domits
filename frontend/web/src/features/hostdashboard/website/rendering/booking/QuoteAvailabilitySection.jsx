import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";
import QuotePanel from "./QuotePanel";
import { QUOTE_STATUS, useWebsiteQuote } from "./useWebsiteQuote";
import { BOOKING_REQUEST_STATUS, useWebsiteBookingRequest } from "./useWebsiteBookingRequest";
import { resolveQuoteErrorPresentation } from "./quoteErrorCopy";
import { EMPTY_BOOKING_GUEST, validateBookingGuestContact } from "./bookingRequestContact";
import { EMPTY_STAY_RANGE, getTodayDateKey, selectStayDate } from "./quoteSelection";
import { TemplateAvailabilityCalendar } from "../templates/templateSharedSections";
import { getOrCreateVisitorId } from "../../services/websiteVisitorId";

const DEFAULT_GUEST_COUNT = 2;

const resolveCapacity = (model) => {
  const capacity = Number(model?.stay?.guests);
  return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
};

const resolveMinimumStay = (model) => {
  const minimumStay = Number(model?.stay?.minimumStay);
  return Number.isFinite(minimumStay) && minimumStay > 0 ? minimumStay : null;
};

const resolveContactHref = (model) => {
  const whatsapp = model?.host?.whatsapp;
  const digits = String(whatsapp?.phoneNumberDigits || "").replaceAll(/\D/g, "");
  return whatsapp?.isAvailable && digits ? `https://wa.me/${digits}` : null;
};

const toDateKeyList = (value) => (Array.isArray(value) ? value : []);

const withoutField = (errors, field) =>
  errors?.[field] ? Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field)) : errors;

export default function QuoteAvailabilitySection({
  model,
  siteId,
  variant = "default",
  templateKey = "",
  propertyTitle = "",
  onSelectTarget = undefined,
  activeTargetId = "",
}) {
  const sessionId = useMemo(() => getOrCreateVisitorId(), []);
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const capacity = resolveCapacity(model);
  const blockedDateKeys = useMemo(
    () =>
      new Set([
        ...toDateKeyList(model?.availability?.externalBlockedDates),
        ...toDateKeyList(model?.availability?.unavailableDateKeys),
      ]),
    [model?.availability]
  );

  const [range, setRange] = useState(EMPTY_STAY_RANGE);
  const [guests, setGuests] = useState(() =>
    capacity ? Math.min(DEFAULT_GUEST_COUNT, capacity) : DEFAULT_GUEST_COUNT
  );
  const [guest, setGuest] = useState(EMPTY_BOOKING_GUEST);
  const [guestErrors, setGuestErrors] = useState({});
  const { requestQuote, notifySelectionChanged, ...quoteState } = useWebsiteQuote({ siteId, sessionId });
  const {
    submitBookingRequest,
    reset: resetBookingRequest,
    ...bookingState
  } = useWebsiteBookingRequest({
    siteId,
    sessionId,
  });
  const bookingSucceeded = bookingState.status === BOOKING_REQUEST_STATUS.SUCCESS;
  const hasBookingError = bookingState.status === BOOKING_REQUEST_STATUS.ERROR;

  const handleSelectionChanged = useCallback(() => {
    notifySelectionChanged();
    if (hasBookingError) {
      resetBookingRequest();
    }
  }, [hasBookingError, notifySelectionChanged, resetBookingRequest]);

  const handleSelectDate = useCallback(
    (dateKey) => {
      if (bookingSucceeded) {
        return;
      }
      const nextRange = selectStayDate({ range, dateKey, blockedDateKeys, todayKey });
      if (nextRange === range) {
        return;
      }
      setRange(nextRange);
      handleSelectionChanged();
    },
    [blockedDateKeys, bookingSucceeded, handleSelectionChanged, range, todayKey]
  );

  const handleGuestsChange = useCallback(
    (nextGuests) => {
      setGuests(nextGuests);
      handleSelectionChanged();
    },
    [handleSelectionChanged]
  );

  const handleRequestQuote = useCallback(async () => {
    const result = await requestQuote({ checkIn: range.checkIn, checkOut: range.checkOut, guests });
    if (result?.error && resolveQuoteErrorPresentation(result.error).clearSelection) {
      setRange(EMPTY_STAY_RANGE);
    }
  }, [guests, range.checkIn, range.checkOut, requestQuote]);

  const handleGuestChange = useCallback((field, value) => {
    setGuest((currentGuest) => ({ ...currentGuest, [field]: value }));
    setGuestErrors((currentErrors) => withoutField(currentErrors, field));
  }, []);

  const handleSubmitBookingRequest = useCallback(async () => {
    const quote = quoteState.quote;
    if (quoteState.status !== QUOTE_STATUS.SUCCESS || !quote) {
      return;
    }

    const { guest: normalizedGuest, errors } = validateBookingGuestContact(guest);
    setGuestErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    await submitBookingRequest({ quote, guest: normalizedGuest });
  }, [guest, quoteState.quote, quoteState.status, submitBookingRequest]);

  const selection = useMemo(
    () => ({
      selectable: !bookingSucceeded,
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      todayKey,
      onSelectDate: handleSelectDate,
    }),
    [bookingSucceeded, handleSelectDate, range.checkIn, range.checkOut, todayKey]
  );

  return (
    <div className={`${styles.quoteSection} ${variant === "panorama" ? styles.quoteSectionPanorama : ""}`.trim()}>
      <div className={styles.quoteSectionCalendar}>
        <TemplateAvailabilityCalendar
          model={model}
          variant={variant}
          templateKey={templateKey}
          propertyTitle={propertyTitle}
          onSelectTarget={onSelectTarget}
          activeTargetId={activeTargetId}
          selection={selection}
        />
      </div>
      <div className={styles.quoteSectionPanel}>
        <QuotePanel
          range={range}
          guests={guests}
          onGuestsChange={handleGuestsChange}
          capacity={capacity}
          minimumStay={resolveMinimumStay(model)}
          quoteState={quoteState}
          onRequestQuote={handleRequestQuote}
          contactHref={resolveContactHref(model)}
          bookingState={bookingState}
          guest={guest}
          guestErrors={guestErrors}
          onGuestChange={handleGuestChange}
          onSubmitBookingRequest={handleSubmitBookingRequest}
        />
      </div>
    </div>
  );
}

QuoteAvailabilitySection.propTypes = {
  model: PropTypes.shape({
    availability: PropTypes.shape({
      externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
      unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
    calendarSection: PropTypes.shape({}),
    stay: PropTypes.shape({
      guests: PropTypes.number,
      minimumStay: PropTypes.number,
    }),
    host: PropTypes.shape({
      whatsapp: PropTypes.shape({
        isAvailable: PropTypes.bool,
        phoneNumberDigits: PropTypes.string,
      }),
    }),
  }).isRequired,
  siteId: PropTypes.string.isRequired,
  variant: PropTypes.oneOf(["default", "panorama"]),
  templateKey: PropTypes.string,
  propertyTitle: PropTypes.string,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
