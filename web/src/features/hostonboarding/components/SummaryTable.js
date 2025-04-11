import React from "react"

function SummaryTable({ data, type }) {
  const formatBoolean = (value) => (value ? "Yes" : "No")

  const DateFormatterDD_MM_YYYY = (dateString) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB") // Formats to dd/mm/yyyy
  }

  // Extract startDate and endDate from selectedDates
  const { startDate, endDate } = data.availability.selectedDates || {}

  // Format the date range
  const dateRange =
    startDate && endDate
      ? `Available from ${DateFormatterDD_MM_YYYY(
          startDate,
        )} to ${DateFormatterDD_MM_YYYY(endDate)}`
      : "Date range not set"

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

        {/* Render details based on type */}
        {type === "House" && (
          <>
            <tr>
              <td>Number of Bedrooms:</td>
              <td>{data.accommodationCapacity.Bedrooms || 0}</td>
            </tr>
            <tr>
              <td>Number of Bathrooms:</td>
              <td>{data.accommodationCapacity.Bathrooms || 0}</td>
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
          </>
        )}

        {type === "Camper" && (
          <>
            <tr>
              <td>Country:</td>
              <td>{data.camperDetails.country || "N/A"}</td>
            </tr>
            <tr>
              <td>City:</td>
              <td>{data.camperDetails.city || "N/A"}</td>
            </tr>
            <tr>
              <td>Postal Code:</td>
              <td>{data.camperDetails.zipCode || "N/A"}</td>
            </tr>
            <tr>
              <td>Street + House Nr.:</td>
              <td>{data.camperDetails.street || "N/A"}</td>
            </tr>
            <tr>
              <td>License Plate:</td>
              <td>{data.camperSpecifications.LicensePlate || "N/A"}</td>
            </tr>
            <tr>
              <td>Brand:</td>
              <td>{data.camperSpecifications.CamperBrand || "N/A"}</td>
            </tr>
            <tr>
              <td>Model:</td>
              <td>{data.camperSpecifications.Model || "N/A"}</td>
            </tr>
            <tr>
              <td>Height:</td>
              <td>{data.camperSpecifications.Height || "N/A"} meters</td>
            </tr>
            <tr>
              <td>Length:</td>
              <td>{data.camperSpecifications.Length || "N/A"} meters</td>
            </tr>
            <tr>
              <td>Fuel Usage:</td>
              <td>{data.camperSpecifications.FuelTank || "N/A"} Liters/hour</td>
            </tr>
            <tr>
              <td>Transmission:</td>
              <td>{data.camperSpecifications.Transmission || "N/A"}</td>
            </tr>
          </>
        )}

        {type === "Boat" && (
          <>
            <tr>
              <td>Country:</td>
              <td>{data.boatDetails.country || "N/A"}</td>
            </tr>
            <tr>
              <td>City:</td>
              <td>{data.boatDetails.city || "N/A"}</td>
            </tr>
            <tr>
              <td>Harbor:</td>
              <td>{data.boatDetails.harbor || "N/A"}</td>
            </tr>
            <tr>
              <td>Number of Cabins:</td>
              <td>{data.accommodationCapacity.Cabins || 0}</td>
            </tr>
            <tr>
              <td>Manufacturer:</td>
              <td>{data.boatSpecifications.Manufacturer || "N/A"}</td>
            </tr>
            <tr>
              <td>Model:</td>
              <td>{data.boatSpecifications.Model || "N/A"}</td>
            </tr>
            <tr>
              <td>Fuel Usage:</td>
              <td>{data.boatSpecifications.FuelTank || "N/A"} Liters/hour</td>
            </tr>
            <tr>
              <td>Top Speed:</td>
              <td>{data.boatSpecifications.Speed || "N/A"} km/h</td>
            </tr>
            <tr>
              <td>Length:</td>
              <td>{data.boatSpecifications.Length || "N/A"} meters</td>
            </tr>
          </>
        )}

        {/* Common Fields */}
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
            From: {data.houseRules.CheckIn.From || "N/A"} Til:{" "}
            {data.houseRules.CheckIn.Til || "N/A"}
          </td>
        </tr>
        <tr>
          <td>Checkout:</td>
          <td>
            From: {data.houseRules.CheckOut.From || "N/A"} Til:{" "}
            {data.houseRules.CheckOut.Til || "N/A"}
          </td>
        </tr>
        {/* Display Selected Amenities */}
        {data.selectedAmenities &&
          Object.entries(data.selectedAmenities).map(
            ([category, amenities]) => (
              <tr key={category}>
                <td>{category}:</td>
                <td>{amenities.length > 0 ? amenities.join(", ") : "N/A"}</td>
              </tr>
            ),
          )}
      </tbody>
    </table>
  )
}

export default SummaryTable
