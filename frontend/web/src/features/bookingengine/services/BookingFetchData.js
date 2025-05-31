import { getAccessToken } from "../../../services/getAccessToken";

const BookingFetchData = async (paymentID) => {
        const response = await fetch(
            `https://92a7z9y2m5.execute-api.eu-north-1.amazonaws.com/development/bookings?readType=paymentId&paymentID=${paymentID}`,
            {
                headers: {
                    Authorization: getAccessToken()
                }

            }
        );

        if (!response.ok) {
            throw new Error(`Error fetching booking details: ${response.statusText}`);
        }
        const data = await response.json();
        
        const bookingData = data[0];
        const id = bookingData.property_id.S;

        // get accommodation data from accommodationID
        const accommodationId = await fetch(
            `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${id}`
        );

        if (!accommodationId.ok) {
            throw new Error(`Error fetching booking details: ${response.statusText}`);
        }
        const accommodationData = await accommodationId.json();

        if (!bookingData) {
            throw new Error("Booking details not found.");
        }

        return {
            bookingData,
            accommodationData
        };
}

export default BookingFetchData;
            