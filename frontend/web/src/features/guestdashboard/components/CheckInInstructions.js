import React from "react";
import PropTypes from "prop-types";

function CheckInInstructions({ address, instructions }) {
  return (
    <div className="card">
      <h3>Check-in instructions</h3>

      <p className="instructionsAddress">
        📍 {address}
      </p>

      <ul>
        {instructions.map((instruction, index) => (
          <li key={index}>{instruction}</li>
        ))}
      </ul>

      <div className="nextStep">
        <strong>Next step:</strong> You’ll receive your access code on
        the day of arrival.
      </div>
    </div>
  );
}

CheckInInstructions.propTypes = {
  address: PropTypes.string,
  instructions: PropTypes.arrayOf(PropTypes.string),
};

CheckInInstructions.defaultProps = {
  instructions: [],
};

export default CheckInInstructions;