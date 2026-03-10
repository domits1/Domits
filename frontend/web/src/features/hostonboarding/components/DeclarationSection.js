import React from "react";
import PropTypes from "prop-types";

function DeclarationSection({
  hasDeclaredLegitimacy,
  onToggleDeclaredLegitimacy,
  hasAcceptedTerms,
  onToggleAcceptedTerms,
}) {
  return (
    <div className="declaration-section">
      <label>
        <input type="checkbox" checked disabled readOnly />
        <span>Mark as draft (always enabled while creating a new listing)</span>
      </label>
      <div className="declarations-section">
        <label>
          <input
            type="checkbox"
            checked={hasDeclaredLegitimacy}
            onChange={onToggleDeclaredLegitimacy}
          />
          <span>
            I declare that this property is legitimate, complete with required
            licenses and permits, which can be displayed upon request. Domits B.V.
            reserves the right to verify and investigate your registration
            information.
          </span>
        </label>
      </div>
      <div className="declarations-section">
        <label>
          <input
            type="checkbox"
            checked={hasAcceptedTerms}
            onChange={onToggleAcceptedTerms}
          />
          <span>
            I confirm that I have read and accept the General Terms and
            Conditions.
          </span>
        </label>
      </div>
    </div>
  );
}

DeclarationSection.propTypes = {
  hasDeclaredLegitimacy: PropTypes.bool.isRequired,
  onToggleDeclaredLegitimacy: PropTypes.func.isRequired,
  hasAcceptedTerms: PropTypes.bool.isRequired,
  onToggleAcceptedTerms: PropTypes.func.isRequired,
};

export default DeclarationSection;
