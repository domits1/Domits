import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import quoteStyles from "../../booking/QuoteAvailabilitySection.module.scss";
import PanoramaPageLink from "../PanoramaPageLink";
import GuestCountField from "../../booking/GuestCountField";
import { QuoteBreakdown, QuotePanelAlert, deriveQuoteView } from "../../booking/QuotePanel";
import { useWebsiteQuote } from "../../booking/useWebsiteQuote";
import { resolveQuoteErrorPresentation } from "../../booking/quoteErrorCopy";
import { resolveDefaultGuestCount, resolveGuestCapacity, resolveHostContactHref } from "../../booking/quoteModel";
import { EMPTY_STAY_RANGE, countStayNights, getTodayDateKey } from "../../booking/quoteSelection";
import { getOrCreateVisitorId } from "../../../services/websiteVisitorId";
import { buildElitePrice } from "./eliteSitePageContent";

export default function EliteSitePropertyBookingPanel({ model, siteId, propertyId, initialStay, buildRequestHref }) {
  const sessionId = useMemo(() => getOrCreateVisitorId(), []);
  const todayKey = useMemo(() => getTodayDateKey(), []);
  const capacity = resolveGuestCapacity(model);
  const [initialSelection] = useState(() => ({
    checkIn: initialStay.checkIn,
    checkOut: initialStay.checkOut,
    guests: initialStay.guests ?? resolveDefaultGuestCount(capacity),
  }));
  const [range, setRange] = useState({ checkIn: initialSelection.checkIn, checkOut: initialSelection.checkOut });
  const [guests, setGuests] = useState(initialSelection.guests);
  const { requestQuote, notifySelectionChanged, ...quoteState } = useWebsiteQuote({ siteId, sessionId, propertyId });
  const quoteView = deriveQuoteView(quoteState);
  const selection = { checkIn: range.checkIn, checkOut: range.checkOut, guests };
  const hasStay = countStayNights(range.checkIn, range.checkOut) > 0 && range.checkIn >= todayKey;
  const canRequestToBook = quoteView.isQuoted;
  const hideAction = Boolean(quoteView.panelError?.hideAction);
  const price = buildElitePrice(model.stay);

  const requestStayQuote = useCallback(
    async (stay) => {
      const result = await requestQuote(stay);
      if (result?.error && resolveQuoteErrorPresentation(result.error).clearSelection) {
        setRange(EMPTY_STAY_RANGE);
      }
    },
    [requestQuote]
  );

  useEffect(() => {
    if (initialSelection.checkIn && initialSelection.checkOut) {
      void requestStayQuote(initialSelection);
    }
  }, [initialSelection, requestStayQuote]);

  const changeDate = (field) => (event) => {
    setRange((currentRange) => ({ ...currentRange, [field]: event.target.value || null }));
    notifySelectionChanged();
  };

  const changeGuests = (nextGuests) => {
    setGuests(nextGuests);
    notifySelectionChanged();
  };

  return (
    <aside className={`${styles.elitePriceCard} ${styles.eliteBookingPanel}`} aria-label="Price and availability">
      {price.amount ? (
        <p className={styles.elitePrice}>
          <span className={styles.elitePriceAmount}>{price.amount}</span>
          <span className={styles.elitePriceUnit}>per night</span>
        </p>
      ) : null}
      <div className={styles.eliteStayFields}>
        <label className={quoteStyles.formField}>
          <span className={quoteStyles.fieldLabel}>Check in</span>
          <input
            type="date"
            className={quoteStyles.input}
            value={range.checkIn || ""}
            min={todayKey}
            onChange={changeDate("checkIn")}
          />
        </label>
        <label className={quoteStyles.formField}>
          <span className={quoteStyles.fieldLabel}>Check out</span>
          <input
            type="date"
            className={quoteStyles.input}
            value={range.checkOut || ""}
            min={range.checkIn || todayKey}
            onChange={changeDate("checkOut")}
          />
        </label>
      </div>
      {quoteView.datesError ? (
        <p className={quoteStyles.fieldError} role="alert">
          {quoteView.datesError}
        </p>
      ) : null}
      <GuestCountField
        value={guests}
        onChange={changeGuests}
        max={capacity}
        disabled={quoteView.isLoading}
        errorMessage={quoteView.guestsError}
      />
      {quoteView.panelError ? (
        <QuotePanelAlert
          presentation={quoteView.panelError}
          requestId={quoteState.error?.requestId || ""}
          contactHref={resolveHostContactHref(model)}
          onRetry={() => requestStayQuote(selection)}
        />
      ) : null}
      {quoteView.showBreakdown ? (
        <QuoteBreakdown quote={quoteState.quote} isStale={quoteView.isStale} staleReason={quoteState.staleReason} />
      ) : null}
      {canRequestToBook ? (
        <PanoramaPageLink href={buildRequestHref(selection)} className={styles.eliteButton}>
          Request to book
        </PanoramaPageLink>
      ) : null}
      {canRequestToBook || hideAction ? null : (
        <button
          type="button"
          className={quoteStyles.action}
          disabled={!hasStay || quoteView.isLoading}
          onClick={() => requestStayQuote(selection)}>
          {quoteView.isLoading ? "Checking…" : "Check availability"}
        </button>
      )}
      <p className={styles.elitePriceNote}>You don&apos;t pay yet. The host confirms first.</p>
    </aside>
  );
}

EliteSitePropertyBookingPanel.propTypes = {
  model: PropTypes.shape({ stay: PropTypes.object.isRequired, host: PropTypes.object }).isRequired,
  siteId: PropTypes.string.isRequired,
  propertyId: PropTypes.string.isRequired,
  initialStay: PropTypes.shape({ checkIn: PropTypes.string, checkOut: PropTypes.string, guests: PropTypes.number })
    .isRequired,
  buildRequestHref: PropTypes.func.isRequired,
};
