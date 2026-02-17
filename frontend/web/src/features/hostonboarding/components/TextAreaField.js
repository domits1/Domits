import React from "react";
import PropTypes from "prop-types";

function TextAreaField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
  className = "",
  required = true,
}) {
  return (
    <section className={`accommodation-title ${className}`.trim()}>
      <label>{label}</label>
      <textarea
        className="textInput locationText"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
      />
      <p>{value.length}/{maxLength}</p>
    </section>
  );
}

export default TextAreaField;

TextAreaField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  maxLength: PropTypes.number.isRequired,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  required: PropTypes.bool,
};

TextAreaField.defaultProps = {
  placeholder: "",
  className: "",
  required: true,
};