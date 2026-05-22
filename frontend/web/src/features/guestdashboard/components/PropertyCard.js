import React, { useContext } from "react";
import PropTypes from "prop-types";
import { FaMapPin, FaCalendarAlt, FaUsers } from "react-icons/fa";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function PropertyCard({
  image = "",
  title = "",
  location = "",
  checkIn = "-",
  checkInTime = "-",
  checkOut = "-",
  checkOutTime = "-",
  guests = 0,
  guestsDetails,
  reservationId = "-",
}) {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;
  const guestLabel = guests === 1 ? (t?.propertyCard?.guest || "guest") : (t?.propertyCard?.guests_plural || "guests");
  const resolvedGuestsDetails = guestsDetails ?? (t?.propertyCard?.unavailable || "Guest details unavailable");

  return (
    <div className="card leftPropertyCard">
      <img src={image} alt={title} className="propertyImage" />

      <div className="leftPropertyCardContent">
        <h3>{title}</h3>

        <div className="locationRow">
          <FaMapPin className="propertyIcon" />
          <span>{location}</span>
        </div>

        <div className="stayInfoRow">
          <div className="stayLeft">
            <div className="stayBlock">
              <span className="label">
                <FaCalendarAlt className="propertyIcon" /> {t?.propertyCard?.checkIn || "Check-in"}
              </span>
              <span className="value">
                {checkIn}
                <span className="time">{checkInTime}</span>
              </span>
            </div>

            <span className="arrow">-&gt;</span>

            <div className="stayBlock">
              <span className="label">
                <FaCalendarAlt className="propertyIcon" /> {t?.propertyCard?.checkOut || "Check-out"}
              </span>
              <span className="value">
                {checkOut}
                <span className="time">{checkOutTime}</span>
              </span>
            </div>
          </div>

          <div className="divider vertical" />

          <div className="stayBlock guests">
            <span className="label">
              <FaUsers className="propertyIcon" /> {t?.propertyCard?.guests || "Guests"}
            </span>
            <span className="value">
              <span className="guestDetails">{resolvedGuestsDetails}</span>
              <span className="guestCount">
                {guests} {guestLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="reservationIdRow">
          {t?.propertyCard?.reservationId || "Reservation ID:"} <strong>{reservationId}</strong>
        </div>
      </div>
    </div>
  );
}

PropertyCard.propTypes = {
  image: PropTypes.string,
  title: PropTypes.string,
  location: PropTypes.string,
  checkIn: PropTypes.string,
  checkInTime: PropTypes.string,
  checkOut: PropTypes.string,
  checkOutTime: PropTypes.string,
  guests: PropTypes.number,
  guestsDetails: PropTypes.string,
  reservationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default PropertyCard;
