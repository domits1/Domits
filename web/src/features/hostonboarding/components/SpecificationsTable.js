import React from 'react'

function SpecificationsTable({data, type}) {
  if (type === 'Boat') {
    return (
      <table className="specifications-table">
        <tbody>
          <tr>
            <td>Manufacturer:</td>
            <td>{data.Manufacturer}</td>
          </tr>
          <tr>
            <td>Model:</td>
            <td>{data.Model}</td>
          </tr>
          <tr>
            <td>General Periodic Inspection:</td>
            <td>{data.GPI}</td>
          </tr>
          <tr>
            <td>Maximum Capacity:</td>
            <td>
              {data.Capacity} {data.Capacity > 1 ? 'People' : 'Person'}
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  if (type === 'Camper') {
    return (
      <table className="specifications-table">
        <tbody>
          <tr>
            <td>License Plate:</td>
            <td>{data.LicensePlate}</td>
          </tr>
          <tr>
            <td>Brand:</td>
            <td>{data.CamperBrand}</td>
          </tr>
          <tr>
            <td>Height:</td>
            <td>{data.Height} meters</td>
          </tr>
        </tbody>
      </table>
    )
  }

  return null
}

export default SpecificationsTable
