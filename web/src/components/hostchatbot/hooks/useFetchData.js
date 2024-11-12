import { useState, useCallback } from 'react';

const useFetchData = () => {
    const [accommodations, setAccommodations] = useState([]);
    const [faqList, setFaqList] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAccommodations = useCallback(async (userId) => {
        if (!userId) return;
        setLoading(true);
        try {
            const response = await fetch(
                'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation',
                {
                    method: 'POST',
                    body: JSON.stringify({ OwnerId: userId }),
                    headers: { 'Content-type': 'application/json; charset=UTF-8' },
                }
            );
            const data = await response.json();
            const accommodationsArray = data.body ? JSON.parse(data.body) : [];
            const formattedAccommodations = accommodationsArray.map((acc) => ({
                id: acc.ID,
                title: acc.Title || 'Accommodation',
                city: acc.City,
                bathrooms: acc.Bathrooms,
                guestAmount: acc.GuestAmount,
                images: acc.Images || {},
            }));
            setAccommodations(formattedAccommodations);
        } catch (error) {
            console.error('Error fetching accommodations:', error);
        } finally {
            setLoading(false);
        }
    }, []); // Stable fetch function

    const fetchFAQ = useCallback(async () => {
        try {
            const response = await fetch('https://vs3lm9q7e9.execute-api.eu-north-1.amazonaws.com/default/readFAQ', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
            const responseData = await response.json();
            const faqData = JSON.parse(responseData.body);
            setFaqList(faqData);
        } catch (error) {
            console.error('Error fetching FAQ data:', error);
        }
    }, []); // Stable fetch function

    return { accommodations, faqList, loading, fetchAccommodations, fetchFAQ };
};

export default useFetchData;
