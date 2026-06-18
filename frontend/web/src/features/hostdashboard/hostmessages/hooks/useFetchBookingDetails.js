import { useState, useEffect } from 'react';
import { getAccessToken } from '../../../../services/getAccessToken';
import { getBookingPropertyId, getGuestBookingDetailsByBookingId } from '../services/messagingService';

const formatBookingDate = (value) => {
    if (value == null || value === "") return null;
    const numeric = Number(value);
    const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-GB').replace(/\//g, '-');
};

const useFetchBookingDetails = (hostId, guestId, {
    withAuth = false,
    accommodationEndpoint = '',
    bookingId = null,
} = {}) => {
    const [bookingDetails, setBookingDetails] = useState(null);
    const [accommodation, setAccommodation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!bookingId || withAuth) {
            setBookingDetails(null);
            setAccommodation(null);
            setError(null);
            setLoading(false);
            return;
        }
        const token = getAccessToken(guestId);
        
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {

                const { bookingDetails: bookingData, accommodation: accommodationData } =
                    await getGuestBookingDetailsByBookingId({ bookingId, guestId, token });
                const arrivalDate = formatBookingDate(bookingData?.arrivalDate || bookingData?.arrivaldate);
                const departureDate = formatBookingDate(bookingData?.departureDate || bookingData?.departuredate);
                if (arrivalDate) bookingData.arrivalDate = arrivalDate;
                if (departureDate) bookingData.departureDate = departureDate;

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

                const bookingPropertyId = getBookingPropertyId(bookingData);
                if (bookingPropertyId && accommodationEndpoint) {
                    setAccommodation(accommodationData);
                } else {
                    setAccommodation(null);
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
    }, [bookingId, guestId, withAuth, accommodationEndpoint]);

    return { bookingDetails, accommodation, loading, error };
};

export default useFetchBookingDetails;
