import React from "react";

// Destructure className from props
function TextAreaField({ label, value, onChange, maxLength, placeholder, className }) {
  return (
    // Apply the passed className along with the existing one
    // Using template literals ensures both classes are applied if className is provided
    <section className={`accommodation-title ${className || ''}`}>
      <label>{label}</label>
      <textarea
        className="textInput locationText" // Keep existing classes if needed
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
        style={{ resize: 'none' }} // Add this line
      />
      <p>{value.length}/{maxLength}</p>
    </section>
  );
}

export default TextAreaField;