// --- START OF FILE PricingRow.js ---

import React from "react"; // Import React

function PricingRow({
                      label,
                      value,
                      onChange, // This prop function will be called
                      type = "number",
                      readonly = false,
                      placeholder = "", // Provide a default value
                    }) {
  // Handle case where value might be initially undefined or null for the input
  const displayValue = value ?? "";

  return (
    <div className="pricing-row">
      <label>{label}</label>
      {readonly ? (
        // Display formatted readonly value
        <p className="pricing-input pricing-readonly-value"> {/* Added specific class */}
          €{/* Check if value is a valid number before formatting */}
          {typeof value === 'number' && Number.isFinite(value)
            ? value.toFixed(2)
            : "0.00"}
        </p>
      ) : (
        // Editable input
        <div className="pricing-input-wrapper"> {/* Optional: Add wrapper for currency symbol */}
          <span className="currency-symbol">€</span> {/* Add currency symbol */}
          <input
            className="pricing-input"
            type={type}
            value={displayValue}
            // Call the 'onChange' prop passed down from the parent,
            // sending the raw input value back up.
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={type === "number" ? 0 : undefined} // Allow 0, maybe not 1
            step={type === "number" ? "0.01" : undefined} // Allow cents
            required // Keep required if necessary
          />
        </div>
      )}
    </div>
  );
}

export default PricingRow;
// --- END OF FILE PricingRow.js ---