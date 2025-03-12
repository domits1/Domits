import { useState, useEffect } from 'react';

const useFetchBookingDetails = (hostID, guestID) => {
    const [bookingDetails, setBookingDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('hello')
        if (!hostID || !guestID) {
            return;
        }

        const fetchBookingDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`https://912b02rvk4.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-GuestBookingDetails?HostID=${hostID}&GuestID=${guestID}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch booking details');
                }
                const data = await response.json();
                if (data?.StartDate) {
                    data.StartDate = new Date(data.StartDate).toLocaleDateString('en-GB').replace(/\//g, '-');
                }
                if (data?.EndDate) {
                    data.EndDate = new Date(data.EndDate).toLocaleDateString('en-GB').replace(/\//g, '-');
                }
                setBookingDetails(data);
            } catch (err) {
                setError(err.message);
                setBookingDetails(null);
            } finally {
                setLoading(false);
            }
        };

        fetchBookingDetails();
    }, [hostID, guestID]);
    console.log(bookingDetails)
    return { bookingDetails, loading, error };
};

export default useFetchBookingDetails;