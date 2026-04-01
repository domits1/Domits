import React from "react";
import PropTypes from "prop-types";

const buildInstructionKey = (() => {
  const separator = "::";

  return (instruction, counts) => {
    const nextCount = (counts.get(instruction) || 0) + 1;
    counts.set(instruction, nextCount);
    return `${instruction}${separator}${nextCount}`;
  };
})();

function CheckInInstructions({ address, instructions }) {
  const instructionCounts = new Map();

  return (
    <div className="card">
      <h3>Check-in instructions</h3>

      <p className="instructionsAddress">
        📍 {address}
      </p>

      <ul>
        {instructions.map((instruction) => (
          <li key={buildInstructionKey(instruction, instructionCounts)}>{instruction}</li>
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