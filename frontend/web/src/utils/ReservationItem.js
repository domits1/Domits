import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import DateFormatterDD_MM_YYYY from "./DateFormatterDD_MM_YYYY";

const getStatusColor = (status) => {
  if (status === "Accepted") return "green";
  if (status === "Cancelled") return "red";
  if (status === "Reserved") return "#003366";
  return "inherit";
};

const ReservationItem = ({ reservation, selectedOption, selectedReservations, handleCheckboxChange }) => {
  const [guestInfo, setGuestInfo] = useState(null);

  useEffect(() => {
    const fetchGuestInfo = async () => {
      try {
        const requestData = {
          UserId: reservation.GuestID,
        };
        const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        });
        if (!response.ok) {
          throw new Error("Failed to fetch guest information");
        }
        const responseData = await response.json();
        const parsedData = JSON.parse(responseData.body)[0];
        setGuestInfo(parsedData.Attributes[2].Value);
      } catch (error) {
        console.error("Error fetching guest info:", error);
      }
    };

    fetchGuestInfo();
  }, [reservation.GuestID]);

  return (
    <tr key={reservation.ID}>
      {selectedOption === "Booking requests" && (
        <td>
          <input
            type="checkbox"
            className="check-box"
            checked={selectedReservations.some((item) => item.ID === reservation.ID)}
            onChange={(event) => handleCheckboxChange(event, reservation)}
          />
        </td>
      )}
      <td>{DateFormatterDD_MM_YYYY(reservation.createdAt)}</td>
      <td>{guestInfo || "loading..."}</td>
      <td>{reservation.Title || "None"}</td>
      <td>{`${DateFormatterDD_MM_YYYY(reservation.StartDate)} - ${DateFormatterDD_MM_YYYY(reservation.EndDate)}`}</td>
      {selectedOption === "All" && (
        <td style={{ color: getStatusColor(reservation.Status) }}>
          {reservation.Status}
        </td>
      )}
      <td>€ {parseFloat(reservation.Price).toFixed(2)}</td>
    </tr>
  );
};

ReservationItem.propTypes = {
  reservation: PropTypes.shape({
    ID: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    GuestID: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    Title: PropTypes.string,
    StartDate: PropTypes.string.isRequired,
    EndDate: PropTypes.string.isRequired,
    Status: PropTypes.string.isRequired,
    Price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  }).isRequired,
  selectedOption: PropTypes.string.isRequired,
  selectedReservations: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleCheckboxChange: PropTypes.func.isRequired,
};

export default ReservationItem;
