import React from "react";
import PropTypes from "prop-types";

function PricingRow({
                        label,
                        value,
                        onChange,
                        type = "number",
                        readonly = false,
                        placeholder,
                        tooltip,
                        inputId,
                        isTotal = false,
                    }) {
    const displayValue =
        typeof value === "number" || !isNaN(parseFloat(value))
            ? parseFloat(value).toFixed(2)
            : "0.00";

    const id = inputId || label.toLowerCase().replace(/\s+/g, "-");
    const rowClassName = `pricing-row ${isTotal ? 'pricing-row-total' : ''}`;

    return (
        <div className={rowClassName}>
            <label htmlFor={!readonly ? id : undefined} className="pricing-label">
                {label}
                {tooltip && (
                    <span className="tooltip-icon" title={tooltip}>?</span>
                )}
            </label>

            {readonly ? (
                // Added € symbol here
                <p className="pricing-value">
                    €{displayValue}
                </p>
            ) : (
                <div className="pricing-input-wrapper">
                    <span className="input-adornment">€</span>
                    <input
                        id={id}
                        className="pricing-input"
                        type={type}
                        value={value ?? ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Allow empty or valid number format (including ".")
                            if (val === "" || /^[0-9]*\.?[0-9]*$/.test(val)) {
                                onChange(val);
                            }
                        }}
                        placeholder={placeholder} // e.g., "200"
                        min="0"
                        step="0.01"
                        aria-label={label}
                    />
                </div>
            )}
        </div>
    );
}

PricingRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onChange: PropTypes.func,
    type: PropTypes.string,
    readonly: PropTypes.bool,
    placeholder: PropTypes.string,
    tooltip: PropTypes.string,
    inputId: PropTypes.string,
    isTotal: PropTypes.bool,
};

export default PricingRow;
