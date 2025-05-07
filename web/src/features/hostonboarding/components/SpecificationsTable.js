// --- START OF REFACTORED SpecificationsTable.js ---
import React from "react";

function SpecificationsTable({ data, type }) { // Receive plain 'data' object and 'type'

  // Helper function to display value or "N/A" if null/undefined/empty string, with optional unit
  const displayValue = (value, unit = "") => {
    if (value !== null && value !== undefined && value !== '') {
      // Add space before unit only if unit exists
      return `${value}${unit ? ` ${unit}` : ''}`;
    }
    return "N/A";
  };


  // Helper for boolean formatting
  const displayBoolean = (value) => typeof value === 'boolean' ? (value ? "Yes" : "No") : "N/A";

  // Helper to format date from timestamp
  const formatDateFromTimestamp = (timestamp) => {
    if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) return "N/A"; // Check for invalid/zero timestamp
    try {
      const date = new Date(timestamp);
      // Check if date is valid after creation
      if (isNaN(date.getTime())) {
        console.warn("Invalid date created from timestamp:", timestamp);
        return "Invalid Date";
      }
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      console.error("Error formatting date from timestamp:", timestamp, e);
      return "Invalid Date Format";
    }
  };


  // Only render for Boat or Camper
  if (type !== "Boat" && type !== "Camper") {
    return null; // Don't render the table for other types
  }

  return (
    <table className="specifications-table">
      <thead>
      <tr><th colSpan="2"><h3>{type} Specifications:</h3></th></tr>
      </thead>
      <tbody>
      {/* --- Common Technical Details --- */}
      <tr><td>Length:</td><td>{displayValue(data.length, "m")}</td></tr>
      <tr><td>Height:</td><td>{displayValue(data.height, "m")}</td></tr>
      <tr><td>Top Speed:</td><td>{displayValue(data.speed, "km/h")}</td></tr>
      <tr><td>Fuel Consumption:</td><td>{displayValue(data.fuelConsumption, "L/h")}</td></tr>
      <tr><td>Renovation Year:</td><td>{displayValue(data.renovationYear)}</td></tr>
      <tr><td>General Periodic Inspection Date:</td><td>{formatDateFromTimestamp(data.generalPeriodicInspection)}</td></tr>

      {/* --- Boat Specific --- */}
      {type === "Boat" && (
        <>
          <tr><td>Manufacturer:</td><td>{displayValue(data.manufacturer)}</td></tr>
          <tr><td>Model:</td><td>{displayValue(data.boatModel)}</td></tr>
          {/* Capacity is now in SummaryTable */}
        </>
      )}

      {/* --- Camper Specific --- */}
      {type === "Camper" && (
        <>
          <tr><td>License Plate:</td><td>{displayValue(data.licensePlate)}</td></tr>
          <tr><td>Brand:</td><td>{displayValue(data.camperBrand)}</td></tr>
          <tr><td>Model:</td><td>{displayValue(data.camperModel)}</td></tr>
          <tr><td>Transmission:</td><td>{displayValue(data.transmission)}</td></tr>
          <tr><td>Four Wheel Drive:</td><td>{displayBoolean(data.fourWheelDrive)}</td></tr>
        </>
      )}
      </tbody>
    </table>
  );
}

export default SpecificationsTable;
// --- END OF REFACTORED SpecificationsTable.js ---