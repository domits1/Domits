import React from "react";

function HouseRuleCheckbox({ label, value, onChange }) {
  return (
    <label className="toggle">
      <span className="toggle-label">{label}</span>
      <input
        className="toggle-checkbox"
        type="checkbox"
        checked={value}
        onChange={onChange}
      />
      <div className="toggle-switch"></div>
    </label>
  );
}

export default HouseRuleCheckbox;
