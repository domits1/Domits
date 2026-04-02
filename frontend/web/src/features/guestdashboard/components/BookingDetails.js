import React from "react";
import PropTypes from "prop-types";

function BookingDetails({ reservationId, bookedDate, onDownload }) {
  return (
    <div className="card">
      <h3>Booking details</h3>

      <div className="bookingDetailsList">
        <div className="detailRow">
          <span>Reservation ID</span>
          <span>{reservationId}</span>
        </div>

        <div className="detailRow">
          <span>Booked on</span>
          <span>{bookedDate}</span>
        </div>
      </div>

      <button
        type="button"
        className="primaryBtn"
        onClick={onDownload}
      >
        ⬇ Download receipt
      </button>
    </div>
  );
}

BookingDetails.propTypes = {
  reservationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  bookedDate: PropTypes.string.isRequired,
  onDownload: PropTypes.func,
};

BookingDetails.defaultProps = {
  onDownload: () => {},
};

export default BookingDetails;