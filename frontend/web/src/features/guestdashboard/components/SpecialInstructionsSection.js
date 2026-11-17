import React from "react";
import PropTypes from "prop-types";

function SpecialInstructionsSection({ instructions = [] }) {
  const enabledInstructions = Array.isArray(instructions)
    ? instructions.filter((rule) => rule?.enabled !== false && rule?.rule_text)
    : [];

  return (
    <div className="card">
      <h3>Special instructions</h3>

      {enabledInstructions.length === 0 ? (
        <p>No additional special instructions have been shared yet.</p>
      ) : (
        <ul>
          {enabledInstructions.map((rule) => (
            <li key={rule.id}>
              {rule.category ? <strong>{rule.category}: </strong> : null}
              {rule.rule_text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

SpecialInstructionsSection.propTypes = {
  instructions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      category: PropTypes.string,
      rule_text: PropTypes.string,
      enabled: PropTypes.bool,
    })
  ),
};

export default SpecialInstructionsSection;