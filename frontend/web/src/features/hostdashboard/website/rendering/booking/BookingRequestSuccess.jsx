import React from "react";
import PropTypes from "prop-types";
import styles from "./QuoteAvailabilitySection.module.scss";
import { formatMinorUnits } from "./quoteSelection";

const pluralizeGuests = (count) => `${count} ${count === 1 ? "guest" : "guests"}`;

export default function BookingRequestSuccess({ result, guestEmail = "" }) {
  return (
    <div className={styles.success} role="status">
      <p className={styles.successTitle}>Request sent</p>
      <p className={styles.successLabel}>Booking reference</p>
      <p className={styles.successReference}>{result.publicBookingRef}</p>
      <dl className={styles.breakdownList}>
        <div className={styles.breakdownRow}>
          <dt>Guests</dt>
          <dd>{pluralizeGuests(result.guests)}</dd>
        </div>
        <div className={`${styles.breakdownRow} ${styles.breakdownTotal}`}>
          <dt>Total</dt>
          <dd>{formatMinorUnits(result.total, result.currency)}</dd>
        </div>
      </dl>
      <p className={styles.successNote}>The host still has to confirm your request — nothing is booked yet.</p>
      {guestEmail ? <p className={styles.hint}>{`We've sent a copy to ${guestEmail}.`}</p> : null}
    </div>
  );
}

BookingRequestSuccess.propTypes = {
  result: PropTypes.shape({
    publicBookingRef: PropTypes.string.isRequired,
    guests: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    currency: PropTypes.string,
  }).isRequired,
  guestEmail: PropTypes.string,
};
