import React, { useContext } from "react";
import PropTypes from "prop-types";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const buildInstructionKey = (() => {
  const separator = "::";

  return (instruction, counts) => {
    const nextCount = (counts.get(instruction) || 0) + 1;
    counts.set(instruction, nextCount);
    return `${instruction}${separator}${nextCount}`;
  };
})();

function CheckInInstructions({ address, instructions = [] }) {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;
  const instructionCounts = new Map();
  const hasInstructions = instructions.length > 0;
  const resolvedAddress = address ?? (t?.checkIn?.addressUnavailable || "Address unavailable");

  return (
    <div className="card">
      <h3>{t?.checkIn?.title || "Check-in instructions"}</h3>

      <p className="instructionsAddress">{t?.checkIn?.address || "Address:"} {resolvedAddress}</p>

      <ul>
        {hasInstructions ? (
          instructions.map((instruction) => (
            <li key={buildInstructionKey(instruction, instructionCounts)}>{instruction}</li>
          ))
        ) : (
          <li>{t?.checkIn?.noInstructions || "No additional check-in instructions have been shared yet."}</li>
        )}
      </ul>

      <div className="nextStep">
        <strong>{t?.checkIn?.nextStep || "Next step:"}</strong> {t?.checkIn?.checkSection || "Check this section again before arrival for any host updates."}
      </div>
    </div>
  );
}

CheckInInstructions.propTypes = {
  address: PropTypes.string,
  instructions: PropTypes.arrayOf(PropTypes.string),
};

export default CheckInInstructions;
