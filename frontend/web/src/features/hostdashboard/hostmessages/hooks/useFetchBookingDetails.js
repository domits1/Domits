import { useState, useEffect } from 'react';
import { getAccessToken } from '../../../../services/getAccessToken';
import { getBookingPropertyId, getGuestBookingDetailsByBookingId, getHostBookingDetails } from '../services/messagingService';

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
    propertyId = null,
} = {}) => {
    const [bookingDetails, setBookingDetails] = useState(null);
    const [accommodation, setAccommodation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const shouldFetchHostBooking = withAuth && hostId && guestId;
        const shouldFetchGuestBooking = !withAuth && bookingId;

        if (!shouldFetchHostBooking && !shouldFetchGuestBooking) {
            setBookingDetails(null);
            setAccommodation(null);
            setError(null);
            setLoading(false);
            return;
        }
        const token = withAuth ? getAccessToken(hostId) : getAccessToken(guestId);
        
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {

                const { bookingDetails: bookingData, accommodation: accommodationData } = withAuth
                    ? await getHostBookingDetails({
                        hostId,
                        guestId,
                        propertyId,
                        bookingId,
                        token,
                        accommodationEndpoint,
                    })
                    : await getGuestBookingDetailsByBookingId({ bookingId, guestId, token });
                const arrivalDate = formatBookingDate(bookingData?.arrivalDate || bookingData?.arrivaldate);
                const departureDate = formatBookingDate(bookingData?.departureDate || bookingData?.departuredate);
                const normalizedBookingData = {
                    ...bookingData,
                    ...(arrivalDate ? { arrivalDate } : {}),
                    ...(departureDate ? { departureDate } : {}),
                };

                const Nights = (() => {
                    if (!normalizedBookingData?.arrivalDate || !normalizedBookingData?.departureDate) return 0;

                    const [startDay, startMonth, startYear] = normalizedBookingData.arrivalDate.split('-').map(Number);
                    const [endDay, endMonth, endYear] = normalizedBookingData.departureDate.split('-').map(Number);

                    const start = new Date(startYear, startMonth - 1, startDay);
                    const end = new Date(endYear, endMonth - 1, endDay);

                    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
                    return diffDays > 0 ? diffDays : 0;
                })();

                setBookingDetails({ ...normalizedBookingData, Nights });

                const bookingPropertyId = getBookingPropertyId(normalizedBookingData);
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
    }, [accommodationEndpoint, bookingId, guestId, hostId, propertyId, withAuth]);

    return { bookingDetails, accommodation, loading, error };
};

export default useFetchBookingDetails;
