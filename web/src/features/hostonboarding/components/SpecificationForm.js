import React from "react";
import LabeledInput from "./LabeledInput";
// Removed RadioGroup import as it's not used
import { toast } from "react-toastify";

function SpecificationForm({ type, specifications, updateSpecification }) {
  const handleNumericChange = (key, value) => {
    const numericValue = parseFloat(value);
    if (value === "" || value === null) {
      updateSpecification(key, null);
    } else if (isNaN(numericValue)) {
      if (value.trim() !== "") {
        toast.error(`${key.replace(/([A-Z])/g, ' $1').trim()} must be a number`);
      }
      updateSpecification(key, null);
    } else {
      updateSpecification(key, numericValue);
    }
  };

  const handleDateChange = (key, dateValue) => {
    updateSpecification(key, dateValue ? new Date(dateValue).getTime() : null);
  };

  const getFormattedDate = (timestamp) => {
    if (typeof timestamp === "number" && !isNaN(timestamp)) {
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
      } catch (e) {
        return "";
      }
    }
    return "";
  };

  // Helper function to render text input
  const renderTextInput = (key, label, placeholder = "", isRequired = false) => (
    <LabeledInput
      label={`${label}${isRequired ? '*' : ''}`} // Add asterisk if required
      value={specifications?.[key] ?? ""}
      onChange={(event) =>
        updateSpecification(key, event.target.value)
      }
      placeholder={placeholder}
    />
  );

  return (
    <div className="specification-form">
      {/* --- Type Specific Required Fields --- */}
      {type === "boat" && (
        <>
          <h1>Boat Details</h1>
          {renderTextInput("Manufacturer", "Manufacturer", "e.g., Beneteau", true)}
          {renderTextInput("Model", "Model", "e.g., Oceanis 38.1", true)}
        </>
      )}

      {type === "camper" && (
        <>
          <h1>Camper Details</h1>
          {renderTextInput("LicensePlate", "License Plate", "e.g., AB-123-CD", true)}
          {renderTextInput("CamperBrand", "Camper Brand", "e.g., Hymer", true)}
          {renderTextInput("Model", "Model", "e.g., B-Class MasterLine T 780", true)}
        </>
      )}

      {/* --- General and Technical Fields (Common) --- */}
      <h1>General</h1>
      <LabeledInput
        label="General periodic inspection*"
        type="date"
        value={getFormattedDate(specifications?.generalPeriodicInspection)}
        onChange={(event) =>
          handleDateChange("generalPeriodicInspection", event.target.value)
        }
      />

      <h1>Technical</h1>
      <LabeledInput
        label="Top speed (Km/h)" // Added /h for clarity
        type="number"
        value={specifications?.speed ?? ""}
        onChange={(event) => handleNumericChange("speed", event.target.value)}
        placeholder="0"
      />
      <LabeledInput
        label="Length (m)"
        type="number"
        value={specifications?.length ?? ""}
        onChange={(event) => handleNumericChange("length", event.target.value)}
        placeholder="0"
      />
      <LabeledInput
        label="Height (m)"
        type="number"
        value={specifications?.height ?? ""}
        onChange={(event) => handleNumericChange("height", event.target.value)}
        placeholder="0"
      />
      <LabeledInput
        label="Fuel consumption (L/h)" // Added consumption for clarity
        type="number"
        value={specifications?.fuelConsumption ?? ""}
        onChange={(event) => handleNumericChange("fuelConsumption", event.target.value)}
        placeholder="0"
      />
      <LabeledInput
        label="Renovation Year" // Simplified label
        type="number"
        value={specifications?.renovationYear ?? ""}
        onChange={(event) => handleNumericChange("renovationYear", event.target.value)}
        min={1900}
        max={new Date().getFullYear()}
        placeholder="YYYY"
      />

      {/* --- Camper Specific Technical/Features --- */}
      {type === "camper" && ( // Changed from "Camper" to "camper" to match useParams
        <>
          <LabeledInput
            label="Transmission"
            value={specifications?.transmission ?? ""}
            onChange={(event) =>
              updateSpecification("transmission", event.target.value)
            }
            placeholder="e.g., Manual or Automatic"
          />
          <h1>Additional Features</h1>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={!!specifications?.fourWheelDrive}
                onChange={(event) =>
                  updateSpecification("fourWheelDrive", event.target.checked)
                }
              />
              4x4 Four-Wheel Drive
            </label>
          </div>
        </>
      )}
    </div>
  );
}

export default SpecificationForm;