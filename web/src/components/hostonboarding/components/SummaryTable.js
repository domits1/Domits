import React from "react";

function SummaryTable({ data, type }) {
  return (
    <table className="accommodation-summary">
      <tbody>
        <tr>
          <th>
            <h3>Property Details:</h3>
          </th>
        </tr>
        <tr>
          <td>Title:</td>
          <td>{data.title}</td>
        </tr>
        <tr>
          <td>Description:</td>
          <td>{data.description}</td>
        </tr>
        <tr>
          <td>Rent:</td>
          <td>€{data.Rent}</td>
        </tr>
        <tr>
          <td>Cleaning Fee:</td>
          <td>€{data.CleaningFee}</td>
        </tr>
        <tr>
          <td>Accommodation Type:</td>
          <td>{type}</td>
        </tr>
        <tr>
          <td>Date Range:</td>
          <td>
            {data.availability.selectedDates.length > 0
              ? `Available from ${data.availability.selectedDates[0].startDate} to ${data.availability.selectedDates[data.availability.selectedDates.length - 1].endDate}`
              : "Date range not set"}
          </td>
        </tr>
        <tr>
          <td>Number of Guests:</td>
          <td>{data.accommodationCapacity.GuestAmount}</td>
        </tr>
      </tbody>
    </table>
  );
}

export default SummaryTable;
