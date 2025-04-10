// --- START OF FILE TimeSelector.js ---

import React from "react";

// Helper function to generate time options
const generateTimeOptions = () => {
    const options = [];
    // Start from 00:00 (midnight) to 23:00 (11 PM)
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, "0");
        const time = `${hour}:00`;
        options.push(
            <option key={time} value={time}>
                {time}
            </option>
        );
    }
    return options;
};

const timeOptions = generateTimeOptions(); // Generate once

function TimeSelector({ label, time, onChange, error }) {
    // Use default empty strings if time prop is initially null/undefined
    const fromValue = time?.From || "";
    const tilValue = time?.Til || "";

    return (
        <div className="time-selector-section">
            <div className="time-selector-label">{label}</div>
            <div className="time-controls">
                <span>From</span>
                <select
                    // Add 'input-error' class if there's an error for 'From'
                    className={error?.field === 'From' ? 'input-error' : ''}
                    value={fromValue}
                    onChange={(e) => onChange("From", e.target.value)}
                    aria-label={`${label} - From time`}
                >
                    {/* Add a default, non-selectable option */}
                    <option value="" disabled>-- : --</option>
                    {timeOptions}
                </select>

                <span>Til</span>
                <select
                    // Add 'input-error' class if there's an error for 'Til'
                    className={error?.field === 'Til' ? 'input-error' : ''}
                    value={tilValue}
                    onChange={(e) => onChange("Til", e.target.value)}
                    aria-label={`${label} - Til time`}
                >
                    {/* Add a default, non-selectable option */}
                    <option value="" disabled>-- : --</option>
                    {timeOptions}
                </select>
            </div>
            {/* Display error message if present */}
            {error?.message && <div className="error-message">{error.message}</div>}
        </div>
    );
}

export default TimeSelector;
// --- END OF FILE TimeSelector.js ---