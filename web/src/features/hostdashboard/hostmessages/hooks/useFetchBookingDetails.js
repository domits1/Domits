import { property } from 'lodash';
import { useState, useEffect } from 'react';
import { getAccessToken } from '../../../../services/getAccessToken';

const useFetchBookingDetails = (hostId, guestId, accessToken) => {
    const [bookingDetails, setBookingDetails] = useState(null);
    const [accommodation, setAccommodation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!hostId || !guestId) {
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {

                const bookingRes = await fetch(`https://912b02rvk4.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-GuestBookingDetails?hostId=${hostId}&guestId=${guestId}`);
                if (!bookingRes.ok) {
                    throw new Error('Failed to fetch booking details');
                }

                const bookingData = await bookingRes.json();
                if (bookingData?.arrivalDate) {
                    bookingData.arrivalDate = new Date(bookingData.arrivalDate).toLocaleDateString('en-GB').replace(/\//g, '-');
                }
                if (bookingData?.departureDate) {
                    bookingData.departureDate = new Date(bookingData.departureDate).toLocaleDateString('en-GB').replace(/\//g, '-');
                }

                const Nights = (() => {
                    if (!bookingData?.arrivalDate || !bookingData?.departureDate) return 0;

                    const [startDay, startMonth, startYear] = bookingData.arrivalDate.split('-').map(Number);
                    const [endDay, endMonth, endYear] = bookingData.departureDate.split('-').map(Number);

                    const start = new Date(startYear, startMonth - 1, startDay);
                    const end = new Date(endYear, endMonth - 1, endDay);

                    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
                    return diffDays > 0 ? diffDays : 0;
                })();

                setBookingDetails({ ...bookingData, Nights });
                // setBookingDetails({ ...bookingData });

                if (bookingData?.property_id) {
                    const accoRes = await fetch(`https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/single?property=${bookingData.property_id}`, {
                        method: 'GET',
                        headers: {
                            'Authorization': getAccessToken(hostId),
                        }
                    });
                    if (!accoRes.ok) {
                        throw new Error('Failed to fetch accommodation');
                    }
                    const accoRaw = await accoRes.json();
                    console.log('Accommodation:', accoRaw);

                    const accoData = typeof accoRaw.body === 'string'
                        ? JSON.parse(accoRaw.body)
                        : accoRaw.body;

                    setAccommodation(accoRaw);
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
    }, [hostId, guestId]);

    return { bookingDetails, accommodation, loading, error };
};

export default useFetchBookingDetails;