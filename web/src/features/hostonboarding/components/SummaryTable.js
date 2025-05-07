// --- START OF REFACTORED SummaryTable.js ---
import React from "react";

function SummaryTable({ data, type }) { // Receive plain 'data' object and 'type'

  // Helper function to display value or "N/A" if null/undefined/empty string
  const displayValue = (value) => (value !== null && value !== undefined && value !== '') ? value : "N/A";

  // Helper for currency formatting
  const displayCurrency = (value) => {
    const num = parseFloat(value);
    return typeof num === 'number' && !isNaN(num) ? `€${num.toFixed(2)}` : "N/A";
  }

  // Helper for boolean formatting
  const displayBoolean = (value) => typeof value === 'boolean' ? (value ? "Yes" : "No") : "N/A";

  // Helper for date formatting (pass ISO string)
  const DateFormatterDD_MM_YYYY = (isoString) => {
    if (!isoString) return "N/A";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "Invalid Date";
      const day = String(date.getUTCDate()).padStart(2, '0');
      const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Format the availability date range using data properties
  const dateRange = data.availabilityStartDate && data.availabilityEndDate
    ? `Available from ${DateFormatterDD_MM_YYYY(data.availabilityStartDate)} to ${DateFormatterDD_MM_YYYY(data.availabilityEndDate)}`
    : "Date range not set";

  return (
    <table className="accommodation-summary">
      <tbody>
      <tr><th colSpan="2"><h3>Property Details:</h3></th></tr>
      <tr><td>Title:</td><td>{displayValue(data.title)}</td></tr>
      <tr><td>Description:</td><td>{displayValue(data.description)}</td></tr>
      <tr><td>Rent:</td><td>{displayCurrency(data.rent)}</td></tr>
      <tr><td>Cleaning fee:</td><td>{displayCurrency(data.cleaningFee)}</td></tr>
      <tr><td>Service fee:</td><td>{displayCurrency(data.serviceFee)}</td></tr>
      <tr><td>Accommodation Type:</td><td>{displayValue(type)}</td></tr> {/* Use type prop */}
      <tr><td>Date Range:</td><td>{dateRange}</td></tr>
      <tr><td>Number of Guests:</td><td>{displayValue(data.guestAmount)}</td></tr>

      {/* Render details based on type prop */}
      {/* Using direct access like data.bedrooms, data.country etc. */}
      {["House", "Villa", "Apartment", "Cottage"].includes(type) && (
        <>
          <tr><td>Number of Bedrooms:</td><td>{displayValue(data.bedrooms)}</td></tr>
          <tr><td>Number of Bathrooms:</td><td>{displayValue(data.bathrooms)}</td></tr>
          <tr><td>Number of Beds:</td><td>{displayValue(data.beds)}</td></tr>
          <tr><td>Country:</td><td>{displayValue(data.country)}</td></tr>
          <tr><td>City:</td><td>{displayValue(data.city)}</td></tr>
          <tr><td>Street:</td><td>{displayValue(data.street)}</td></tr>
          <tr><td>House Nr:</td><td>{displayValue(data.houseNumber)}{data.houseNumberExtension ? ` ${data.houseNumberExtension}`: ''}</td></tr>
          <tr><td>Postal Code:</td><td>{displayValue(data.postalCode)}</td></tr>
        </>
      )}

      {type === "Camper" && (
        <>
          <tr><td>Country:</td><td>{displayValue(data.country)}</td></tr>
          <tr><td>City:</td><td>{displayValue(data.city)}</td></tr>
          <tr><td>Street:</td><td>{displayValue(data.street)}</td></tr>
          <tr><td>Postal Code:</td><td>{displayValue(data.postalCode)}</td></tr>
          {/* Specifications are shown in SpecificationsTable */}
        </>
      )}

      {type === "Boat" && (
        <>
          <tr><td>Number of Cabins:</td><td>{displayValue(data.cabins)}</td></tr>
          <tr><td>Country:</td><td>{displayValue(data.country)}</td></tr>
          <tr><td>City:</td><td>{displayValue(data.city)}</td></tr>
          <tr><td>Harbor:</td><td>{displayValue(data.harbor)}</td></tr>
          {/* Specifications are shown in SpecificationsTable */}
        </>
      )}

      {/* Common Fields */}
      <tr><th colSpan="2"><h3>Rules & Check-in:</h3></th></tr>
      <tr><td>Smoking Allowed:</td><td>{displayBoolean(data.smokingAllowed)}</td></tr>
      <tr><td>Pets Allowed:</td><td>{displayBoolean(data.petsAllowed)}</td></tr>
      <tr><td>Parties/Events Allowed:</td><td>{displayBoolean(data.partiesEventsAllowed)}</td></tr>
      <tr><td>Check-in Time:</td><td>From: {displayValue(data.checkInFrom)} Till: {displayValue(data.checkInTill)}</td></tr>
      <tr><td>Check-out Time:</td><td>From: {displayValue(data.checkOutFrom)} Till: {displayValue(data.checkOutTill)}</td></tr>

      <tr><th colSpan="2"><h3>Amenities:</h3></th></tr>
      {/* Ensure amenities string isn't empty before displaying */}
      <tr><td colSpan="2">{displayValue(data.amenities) === "N/A" ? "N/A" : data.amenities}</td></tr>
      </tbody>
    </table>
  );
}

export default SummaryTable;
// --- END OF REFACTORED SummaryTable.js ---