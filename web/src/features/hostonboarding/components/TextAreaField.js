import React from "react";

function TextAreaField({
                         label,
                         value = "", // Provide default value
                         onChange,
                         maxLength,
                         placeholder,
                         className,
                         showCounter,
                         hintText,
                         required, // Added required prop
                       }) {
  const handleChange = (event) => {
    if (onChange) {
      onChange(event.target.value);
    }
  };

  return (
    <section className={`text-area-field-container ${className || ""}`}>
      {label && <label>{label}</label>}
      {hintText && <p className="hint-text">{hintText}</p>}
      <textarea
        className="textInput locationText" // Keep existing classes if needed
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required} // Use required prop
        style={{ resize: "none" }}
      />
      {showCounter && maxLength && (
        <p className="char-count">
          {value?.length ?? 0}/{maxLength}
        </p>
      )}
    </section>
  );
}

export default TextAreaField;