import React from "react";
import PropTypes from "prop-types";
import { FaMapPin, FaCalendarAlt, FaUsers } from "react-icons/fa";

function PropertyCard({
  image,
  title,
  location,
  checkIn,
  checkInTime,
  checkOut,
  checkOutTime,
  guests,
  guestsDetails,
  reservationId,
}) {
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
                <FaCalendarAlt className="propertyIcon" /> Check-in
              </span>
              <span className="value">
                {checkIn}
                <span className="time">{checkInTime}</span>
              </span>
            </div>

            <span className="arrow">→</span>

            <div className="stayBlock">
              <span className="label">
                <FaCalendarAlt className="propertyIcon" /> Check-out
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
              <FaUsers className="propertyIcon" /> Guests
            </span>
            <span className="value">
              <span className="guestDetails">{guestsDetails}</span>
              <span className="guestCount">{guests} guests</span>
            </span>
          </div>
        </div>

        <div className="reservationIdRow">
          Reservation ID: <strong>{reservationId}</strong>
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