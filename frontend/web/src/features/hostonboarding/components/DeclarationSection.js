import React from "react";

function DeclarationSection({ drafted, toggleDrafted, declare, toggleDeclareDrafted, confirm, toggleConfirmDrafted }) {
  return (
    <div className="declaration-section">
      <label>
        <input type="checkbox" checked={drafted} onChange={toggleDrafted} />
        Mark as draft
      </label>
      <div className="declarations-section">
        <label>
      <input type="checkbox" checked={declare} onChange={toggleDeclareDrafted} />
          I declare that this property is legitimate, complete with required
          licenses and permits, which can be displayed upon request. Domits B.V.
          reserves the right to verify and investigate your registration
          information.
        </label>
        </div>
        <div className="declarations-section">
        <label>
        <input type="checkbox" checked={confirm} onChange={toggleConfirmDrafted} />
          I confirm that I have read and accept the General Terms and
          Conditions.
        </label>
      </div>
    </div>
  );
}
export default DeclarationSection;
