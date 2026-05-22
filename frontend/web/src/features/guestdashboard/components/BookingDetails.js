import React, { useContext } from "react";
import PropTypes from "prop-types";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function BookingDetails({ reservationId, bookedDate, onDownload = () => {} }) {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  return (
    <div className="card">
      <h3>{t?.bookingDetails?.title || "Booking details"}</h3>

      <div className="bookingDetailsList">
        <div className="detailRow">
          <span>{t?.bookingDetails?.reservationId || "Reservation ID"}</span>
          <span>{reservationId}</span>
        </div>

        <div className="detailRow">
          <span>{t?.bookingDetails?.bookedOn || "Booked on"}</span>
          <span>{bookedDate}</span>
        </div>
      </div>

      <button type="button" className="primaryBtn" onClick={onDownload}>
        {t?.bookingDetails?.downloadReceipt || "Download receipt"}
      </button>
    </div>
  );
}

BookingDetails.propTypes = {
  reservationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  bookedDate: PropTypes.string.isRequired,
  onDownload: PropTypes.func,
};

export default BookingDetails;
