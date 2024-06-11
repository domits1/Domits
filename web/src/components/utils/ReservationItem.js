import React, { useEffect, useState } from 'react';
import DateFormatterDD_MM_YYYY from "./DateFormatterDD_MM_YYYY";

const ReservationItem = ({ reservation, selectedOption, selectedReservations, handleCheckboxChange }) => {
    const [guestInfo, setGuestInfo] = useState(null);

    useEffect(() => {
        const fetchGuestInfo = async () => {
            try {
                const requestData = {
                    UserId: reservation.GuestID
                };
                const response = await fetch(`https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData)
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch guest information');
                }
                const responseData = await response.json();
                const parsedData = JSON.parse(responseData.body)[0];
                setGuestInfo(parsedData.Attributes[2].Value);
            } catch (error) {
                console.error('Error fetching guest info:', error);
            }
        };

        fetchGuestInfo();
    }, [reservation.GuestID]);

    return (
        <tr key={reservation.ID}>
            {selectedOption === 'Booking requests' && (
                <td>
                    <input
                        type="checkbox"
                        className="check-box"
                        checked={selectedReservations.some(item => item.ID === reservation.ID)}
                        onChange={(event) => handleCheckboxChange(event, reservation)}
                    />
                </td>
            )}
            <td>{DateFormatterDD_MM_YYYY(reservation.createdAt)}</td>
            <td>{guestInfo ? guestInfo : 'loading...'}</td>
            <td>{`${DateFormatterDD_MM_YYYY(reservation.StartDate)} - ${DateFormatterDD_MM_YYYY(reservation.EndDate)}`}</td>
            {selectedOption === 'All' && (
                <td style={{
                    color: reservation.Status === 'Accepted' ? 'green' :
                        reservation.Status === 'Cancelled' ? 'red' :
                            reservation.Status === 'Reserved' ? '#003366' : 'inherit'
                }}>
                    {reservation.Status}
                </td>
            )}
            <td>€ {reservation.Price}</td>
        </tr>
    );
};

export default ReservationItem;
