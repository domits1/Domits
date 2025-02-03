import React from "react";

function SummaryTable({ data, type }) {
  const formatBoolean = (value) => (value ? "Yes" : "No");

  const DateFormatterDD_MM_YYYY = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
  };

  const dateRange =
    data.availability.selectedDates.length > 0
      ? `Available from ${DateFormatterDD_MM_YYYY(
          data.availability.selectedDates[0]
        )} to ${DateFormatterDD_MM_YYYY(
          data.availability.selectedDates[data.availability.selectedDates.length - 1]
        )}`
      : "Date range not set";

  return (
    <table className="accommodation-summary">
      <tbody>
        <tr>
          <th colSpan="2">
            <h3>Property Details:</h3>
          </th>
        </tr>
        <tr>
          <td>Title:</td>
          <td>{data.title || "N/A"}</td>
        </tr>
        <tr>
          <td>Description:</td>
          <td>{data.description || "N/A"}</td>
        </tr>
        <tr>
          <td>Rent:</td>
          <td>€{data.Rent || "N/A"}</td>
        </tr>
        <tr>
          <td>Cleaning fee:</td>
          <td>€{data.CleaningFee || "N/A"}</td>
        </tr>
        <tr>
          <td>Accommodation Type:</td>
          <td>{type || "N/A"}</td>
        </tr>
        <tr>
          <td>Date Range:</td>
          <td>{dateRange}</td>
        </tr>
        <tr>
          <td>Number of Guests:</td>
          <td>{data.accommodationCapacity.GuestAmount || 0}</td>
        </tr>
        <tr>
          <td>Number of Bedrooms:</td>
          <td>{data.accommodationCapacity.Bedrooms || 0}</td>
        </tr>
        <tr>
          <td>Number of Bathrooms:</td>
          <td>{data.accommodationCapacity.Bathrooms || 0}</td>
        </tr>
        <tr>
          <td>Number of Fixed Beds:</td>
          <td>{data.accommodationCapacity.Beds || 0}</td>
        </tr>
        <tr>
          <td>Country:</td>
          <td>{data.address.country || "N/A"}</td>
        </tr>
        <tr>
          <td>City:</td>
          <td>{data.address.city || "N/A"}</td>
        </tr>
        <tr>
          <td>Postal Code:</td>
          <td>{data.address.zipCode || "N/A"}</td>
        </tr>
        <tr>
          <td>Street + House Nr.:</td>
          <td>{data.address.street || "N/A"}</td>
        </tr>
        <tr>
          <td>Smoking:</td>
          <td>{formatBoolean(data.houseRules.AllowSmoking)}</td>
        </tr>
        <tr>
          <td>Pets:</td>
          <td>{formatBoolean(data.houseRules.AllowPets)}</td>
        </tr>
        <tr>
          <td>Parties/events:</td>
          <td>{formatBoolean(data.houseRules.AllowParties)}</td>
        </tr>
        <tr>
          <td>Checkin:</td>
          <td>
            From: {data.houseRules.CheckIn.From || "N/A"} Til: {data.houseRules.CheckIn.Til || "N/A"}
          </td>
        </tr>
        <tr>
          <td>Checkout:</td>
          <td>
            From: {data.houseRules.CheckOut.From || "N/A"} Til: {data.houseRules.CheckOut.Til || "N/A"}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default SummaryTable;
