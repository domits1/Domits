import React from "react";

// Update the props destructuring to match what SummaryViewAndSubmit passes
function DeclarationSection({
                                drafted,
                                toggleDrafted,
                                declare,
                                toggleDeclare, // <--- Change this name
                                confirm,
                                toggleConfirm, // <--- Change this name
                            }) {
    return (
        <div className="declaration-section">
            {/* Draft Checkbox - Assuming this is correct */}
            <label style={{ display: 'block', marginBottom: '10px' }}> {/* Added basic styling for clarity */}
                <input type="checkbox" checked={drafted} onChange={toggleDrafted} />
                Mark as draft
            </label>

            <hr /> {/* Optional separator */}

            {/* Declaration Checkbox */}
            <div className="declarations-section" style={{ marginBottom: '10px' }}> {/* Added basic styling */}
                <label style={{ display: 'flex', alignItems: 'start' }}> {/* Flex layout for better alignment */}
                    <input
                        type="checkbox"
                        checked={declare}
                        onChange={toggleDeclare} // <--- Use the correct prop name here
                        style={{ marginRight: '8px', marginTop: '4px' }} // Style checkbox
                    />
                    <span> {/* Wrap text in span for better control */}
                        I declare that this property is legitimate, complete with required
            licenses and permits, which can be displayed upon request. Domits B.V.
            reserves the right to verify and investigate your registration
            information.
          </span>
                </label>
            </div>

            {/* Confirmation Checkbox */}
            <div className="declarations-section">
                <label style={{ display: 'flex', alignItems: 'start' }}> {/* Flex layout */}
                    <input
                        type="checkbox"
                        checked={confirm}
                        onChange={toggleConfirm} // <--- Use the correct prop name here
                        style={{ marginRight: '8px', marginTop: '4px' }} // Style checkbox
                    />
                    <span> {/* Wrap text in span */}
                        I confirm that I have read and accept the General Terms and
            Conditions.
          </span>
                </label>
            </div>
        </div>
    );
}
export default DeclarationSection;