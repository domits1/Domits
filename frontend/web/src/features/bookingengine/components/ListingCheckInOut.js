import React from "react";
import PropTypes from "prop-types";
import "./ListingPolicySections.css";

const ListingCheckInOut = ({ info }) => {
  if (!info) return null;

  const hasInfo =
    info.checkInTime || info.checkOutTime || info.lateCheckIn || info.lateCheckOut || info.preparationTime;
  if (!hasInfo) return null;

  return (
    <div className="listing-policy-section">
      <h3 className="listing-policy-section-title">Check-in & Check-out</h3>
      <ul className="listing-policy-section-list">
        {info.checkInTime && (
          <li className="listing-policy-section-list-item">
            <strong>Check-in:</strong> {info.checkInTime}
          </li>
        )}
        {info.checkOutTime && (
          <li className="listing-policy-section-list-item">
            <strong>Check-out:</strong> {info.checkOutTime}
          </li>
        )}
        {info.lateCheckIn && (
          <li className="listing-policy-section-list-item">
            <strong>Late check-in:</strong> {info.lateCheckIn}
          </li>
        )}
        {info.lateCheckOut && (
          <li className="listing-policy-section-list-item">
            <strong>Late check-out:</strong> {info.lateCheckOut}
          </li>
        )}
        {info.preparationTime && (
          <li className="listing-policy-section-list-item">
            <strong>Preparation time:</strong> {info.preparationTime}
          </li>
        )}
      </ul>
    </div>
  );
};

ListingCheckInOut.propTypes = {
  info: PropTypes.object,
};

export default ListingCheckInOut;
