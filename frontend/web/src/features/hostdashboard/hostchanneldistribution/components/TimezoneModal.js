import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import ChannexModalShell from "./ChannexModalShell";

// The options are IANA ids (PROPOSED, TO CONFIRM WITH ENES). The host reads the id with its
// underscores turned into spaces, such as "America/Los Angeles".
const labelOf = (zone) => zone.replaceAll("_", " ");

// Asks which timezone a listing is in, only for a listing in a country with several (D4). Nothing is
// requested from here: Continue hands the picked zone to the caller, and every other way out closes.
function TimezoneModal({ options, onContinue, onClose }) {
  const titleId = useId();
  const selectId = useId();
  const [zone, setZone] = useState("");

  return (
    <ChannexModalShell titleId={titleId} title="Choose a timezone" onClose={onClose}>
      <p className="chdist-modal__note">Pick the timezone this property is in.</p>
      <div className="chdist-modal__field">
        <label className="chdist-modal__label" htmlFor={selectId}>
          Timezone
        </label>
        <select
          id={selectId}
          className="chdist-modal__input"
          value={zone}
          onChange={(event) => setZone(event.target.value)}>
          <option value="">Choose a timezone</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {labelOf(option)}
            </option>
          ))}
        </select>
      </div>
      <div className="chdist-modal__actions">
        <button type="button" className="chdist-btn chdist-btn--secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="chdist-btn chdist-btn--primary"
          disabled={!zone}
          onClick={() => onContinue(zone)}>
          Continue
        </button>
      </div>
    </ChannexModalShell>
  );
}

TimezoneModal.propTypes = {
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  onContinue: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TimezoneModal;
