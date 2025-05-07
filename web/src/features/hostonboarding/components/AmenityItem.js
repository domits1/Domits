// Filename: AmenityItem.js
import React from "react";

// Receives:
// - amenityName: string (the name to display)
// - category: string (the category it belongs to)
// - checked: boolean (whether it's currently selected)
// - onChange: function(category, amenityName, isChecked) - the handler from AmenitiesView
function AmenityItem({ amenityName, category, checked, onChange }) {

  const handleChange = (event) => {
    // Call the parent handler with category, name, and the NEW checked status
    onChange(category, amenityName, event.target.checked);
  };

  return (
    <label>
      <input
        type="checkbox"
        name={amenityName} // Use name for the input name attribute
        checked={checked} // Controlled component based on prop
        onChange={handleChange} // Use the local handler which calls the prop
      />
      {amenityName} {/* Display the name */}
    </label>
  );
}

export default AmenityItem;