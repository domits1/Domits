import React from "react";

// Assuming toggleDrafted updates the draft status in Zustand state
// Added placeholders for declare/confirm logic
function DeclarationSection({
                              drafted,
                              toggleDrafted,
                              // --- Add state and handlers for other declarations ---
                              // Example:
                              // declareChecked,
                              // toggleDeclare,
                              // confirmChecked,
                              // toggleConfirm
                            }) {

  // Placeholder handlers if not passed via props
  const handleDeclareChange = (event) => {
    console.log("Declare checkbox changed:", event.target.checked);
    // Call prop function if passed: toggleDeclare(event.target.checked);
  };

  const handleConfirmChange = (event) => {
    console.log("Confirm checkbox changed:", event.target.checked);
    // Call prop function if passed: toggleConfirm(event.target.checked);
  };

  return (
    <div className="declaration-section">
      <label className="declaration-item">
        <input
          type="checkbox"
          checked={drafted}
          onChange={toggleDrafted} // Use the passed onChange handler
        />
        Mark as draft
      </label>
      <div className="declarations-section">
        <label className="declaration-item">
          <input
            type="checkbox"
            // checked={declareChecked} // Use state variable for checked status
            onChange={handleDeclareChange} // Add onChange handler
          />
          I declare that this property is legitimate, complete with required
          licenses and permits, which can be displayed upon request. Domits B.V.
          reserves the right to verify and investigate your registration
          information.
        </label>
      </div>
      <div className="declarations-section">
        <label className="declaration-item">
          <input
            type="checkbox"
            // checked={confirmChecked} // Use state variable for checked status
            onChange={handleConfirmChange} // Add onChange handler
          />
          I confirm that I have read and accept the General Terms and
          Conditions.
        </label>
      </div>
    </div>
  );
}
export default DeclarationSection;