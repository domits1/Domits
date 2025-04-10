// --- START OF FILE TextAreaField.js ---

import React from "react";
import PropTypes from 'prop-types'; // Optional: Add prop types for clarity
import '../styles/TextAreaField.css'; // Import dedicated CSS for this component

// Define a simple CSS file for this component (TextAreaField.css)
// Create src/components/TextAreaField.css if it doesn't exist:
/*
.textarea-field-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    margin-bottom: 1rem; // Default spacing below the field
}

.textarea-field-label {
    margin-bottom: 6px;
    font-weight: bold;
    font-size: 0.95em;
    color: #333;
}

.textarea-field-input {
    width: 100%;
    min-height: 150px;
    padding: 12px 15px;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 1em;
    line-height: 1.5;
    resize: vertical;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    box-sizing: border-box;
}

.textarea-field-input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.textarea-field-info {
    display: flex;
    justify-content: flex-end; // Align counter to the right by default
    align-items: center;
    width: 100%;
    padding: 5px 2px;
    font-size: 0.85em;
    color: #666;
    margin-top: 2px; // Small space between textarea and counter
}
*/


function TextAreaField({
                           label,
                           value = "", // Default value
                           onChange,
                           maxLength,
                           placeholder,
                           className = "", // Allow passing extra classes
                           required = false, // Add required prop
                           // Add a prop to optionally hide the counter
                           showCounter = true,
                           // Add hint text prop
                           hintText = null
                       }) {

    const handleInputChange = (event) => {
        // Ensure onChange is called with the value, consistent with previous usage
        if (onChange) {
            onChange(event.target.value);
        }
    };

    // Calculate remaining characters if needed for hint, etc.
    // const remaining = maxLength ? maxLength - value.length : null;

    return (
        // Use a div with a base class, allow adding external classes
        <div className={`textarea-field-container ${className}`}>
            {label && <label className="textarea-field-label">{label}</label>}
            <textarea
                className="textarea-field-input" // Use specific class for styling
                value={value}
                onChange={handleInputChange}
                placeholder={placeholder}
                maxLength={maxLength}
                required={required}
                // Removed inline styles
            />
            {/* Container for counter and optional hint */}
            {(showCounter || hintText) && (
                <div className="textarea-field-info">
                    {/* Optionally display hint text here if desired */}
                    {hintText && <span className="textarea-field-hint">{hintText}</span>}
                    {/* Align counter to the right */}
                    {showCounter && maxLength && (
                        <span className="textarea-field-counter">
                            {value.length}/{maxLength}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

// Optional: Add prop types
TextAreaField.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    maxLength: PropTypes.number,
    placeholder: PropTypes.string,
    className: PropTypes.string,
    required: PropTypes.bool,
    showCounter: PropTypes.bool,
    hintText: PropTypes.string,
};


export default TextAreaField;
// --- END OF FILE TextAreaField.js ---