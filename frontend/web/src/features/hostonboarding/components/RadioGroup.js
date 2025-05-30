import React from "react";

function RadioGroup({ label, name, options, selectedValue, onChange }) {
  return (
    <div className="radio-group">
      <label>{label}</label>
      {options.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={name}
            checked={selectedValue === option}
            onChange={() => onChange(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export default RadioGroup;
