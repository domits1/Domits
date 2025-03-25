import React from "react";

function TextAreaField({ label, value, onChange, maxLength, placeholder }) {
    return (
        <section className="accommodation-title" style={{ marginBottom: "0" }}>
            <label>{label}</label>
            <textarea
                className="textInput locationText"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                required
                style={{ marginBottom: "5px" }}
            />
            <p style={{ marginTop: "0" }}>{value.length}/{maxLength}</p>
        </section>
    );
}

export default TextAreaField;