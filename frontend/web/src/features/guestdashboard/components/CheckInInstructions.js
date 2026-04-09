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
  const hasInstructions = instructions.length > 0;

  return (
    <div className="card">
      <h3>Check-in instructions</h3>

      <p className="instructionsAddress">Address: {address}</p>

      <ul>
        {hasInstructions ? (
          instructions.map((instruction) => (
            <li key={buildInstructionKey(instruction, instructionCounts)}>{instruction}</li>
          ))
        ) : (
          <li>No additional check-in instructions have been shared yet.</li>
        )}
      </ul>

      <div className="nextStep">
        <strong>Next step:</strong> Check this section again before arrival for any host updates.
      </div>
    </div>
  );
}

CheckInInstructions.propTypes = {
  address: PropTypes.string,
  instructions: PropTypes.arrayOf(PropTypes.string),
};

CheckInInstructions.defaultProps = {
  address: "Address unavailable",
  instructions: [],
};

export default CheckInInstructions;