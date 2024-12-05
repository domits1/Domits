import React from "react";

function DeclarationSection({ drafted, toggleDrafted }) {
  return (
    <div className="declaration-section">
      <label>
        <input
          type="checkbox"
          checked={drafted}
          onChange={toggleDrafted}
        />
        Mark as draft
      </label>
    </div>
  );
}

export default DeclarationSection;
