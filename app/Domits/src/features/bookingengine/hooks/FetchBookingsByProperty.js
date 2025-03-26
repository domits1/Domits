import DateFormatterYYYY_MM_DD from "../../../screens/utils/DateFormatterYYYY_MM_DD";

const FetchBookingsByProperty = async (parsedAccommodation, setBookings, setBookedDates) => {
    try {
        const response = await fetch(
            'https://ct7hrhtgac.execute-api.eu-north-1.amazonaws.com/default/retrieveBookingByAccommodationAndStatus',
            {
                method: 'POST',
                body: JSON.stringify({
                    AccoID: parsedAccommodation.ID,
                    Status: 'Accepted',
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            },
        );
        if (!response.ok) {
            throw new Error('Failed to fetch');
        }
        const data = await response.json();

        if (data.body && typeof data.body === 'string') {
            const retrievedBookingDataArray = JSON.parse(data.body);

            if (Array.isArray(retrievedBookingDataArray)) {
                const validBookings = retrievedBookingDataArray
                    .filter(booking => {
                        const startDate = booking.StartDate?.S;
                        const endDate = booking.EndDate?.S;

                        const startDateValid =
                            startDate && !isNaN(Date.parse(startDate));
                        const endDateValid = endDate && !isNaN(Date.parse(endDate));

                        return startDateValid && endDateValid;
                    })
                    .map(booking => {
                        const startDateObj = new Date(booking.StartDate.S);
                        startDateObj.setDate(startDateObj.getDate() + 1);
                        const startDateFormatted = DateFormatterYYYY_MM_DD(startDateObj);
                        const endDateObj = new Date(booking.EndDate.S);
                        endDateObj.setDate(endDateObj.getDate() + 1);
                        const endDateFormatted = DateFormatterYYYY_MM_DD(endDateObj);

                        return [startDateFormatted, endDateFormatted];
                    });

                setBookings(retrievedBookingDataArray);
                setBookedDates(validBookings);
            } else {
                console.error(
                    'Retrieved data is not an array:',
                    retrievedBookingDataArray,
                );
            }
        }
    } catch (error) {
        console.error('Failed to fetch booking data:', error);
    }
};

export default FetchBookingsByProperty;