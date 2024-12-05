import React from "react";

function CheckBoxGroup({ options, selectedValues, onChange }) {
  return (
    <div className="checkbox-group">
      {options.map((option) => (
        <label key={option}>
          <input
            type="checkbox"
            checked={selectedValues.includes(option)}
            onChange={() => onChange(option)}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export default CheckBoxGroup;
