import React from "react";

function TextAreaField({ label, value, onChange, maxLength, placeholder }) {
  return (
    <section className="accommodation-title">
      <label>{label}</label>
      <textarea
        className="textInput locationText"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required
      />
      <p>{value.length}/{maxLength}</p>
    </section>
  );
}

export default TextAreaField;