import { useState, useEffect } from 'react';

const useFetchBookingDetails = (hostID, guestID) => {
    const [bookingDetails, setBookingDetails] = useState(null);
    const [accommodation, setAccommodation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!hostID || !guestID) {
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const bookingRes = await fetch(`https://912b02rvk4.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-GuestBookingDetails?HostID=${hostID}&GuestID=${guestID}`);
                if (!bookingRes.ok) {
                    throw new Error('Failed to fetch booking details');
                }
                const bookingData = await bookingRes.json();

                if (bookingData?.StartDate) {
                    bookingData.StartDate = new Date(bookingData.StartDate).toLocaleDateString('en-GB').replace(/\//g, '-');
                }
                if (bookingData?.EndDate) {
                    bookingData.EndDate = new Date(bookingData.EndDate).toLocaleDateString('en-GB').replace(/\//g, '-');
                }

                const Nights = (() => {
                    if (!bookingData?.StartDate || !bookingData?.EndDate) return 0;

                    const [startDay, startMonth, startYear] = bookingData.StartDate.split('-').map(Number);
                    const [endDay, endMonth, endYear] = bookingData.EndDate.split('-').map(Number);

                    const start = new Date(startYear, startMonth - 1, startDay);
                    const end = new Date(endYear, endMonth - 1, endDay);

                    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
                    return diffDays > 0 ? diffDays : 0;
                })();
                setBookingDetails({ ...bookingData, Nights });

                if (bookingData?.AccoID) {

                    const accoRes = await fetch(' https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ ID: bookingData.AccoID }),
                    });
                    if (!accoRes.ok) {
                        throw new Error('Failed to fetch accommodation');
                    }
                    const accoRaw = await accoRes.json();

                    const accoData = typeof accoRaw.body === 'string'
                        ? JSON.parse(accoRaw.body)
                        : accoRaw.body;

                    setAccommodation(accoData);
                }

            } catch (err) {
                setError(err.message);
                setBookingDetails(null);
                setAccommodation(null);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [hostID, guestID]);

    return { bookingDetails, accommodation, loading, error };
};

export default useFetchBookingDetails;