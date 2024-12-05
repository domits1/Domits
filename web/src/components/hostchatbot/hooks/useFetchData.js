import { useState, useCallback } from 'react';

const useFetchData = () => {
    const [accommodations, setAccommodations] = useState([]);
    const [faqList, setFaqList] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAccommodations = useCallback(async (userId) => {
        if (!userId) return;
        setLoading(true);
        try {
            console.log("Fetching accommodations for user:", userId);

            const response = await fetch(
                'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation',
                {
                    method: 'POST',
                    body: JSON.stringify({ OwnerId: userId }),
                    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                }
            );

            console.log("Response Status:", response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch accommodations: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Accommodations Response Data:", data);

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
            console.log("Fetching FAQ data...");

            const response = await fetch('https://lsenj0sq47.execute-api.eu-north-1.amazonaws.com/default/General-Help-Production-Read-Faqlist', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            console.log("Response Status:", response.status);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch FAQ: ${response.statusText} - ${errorText}`);
            }

            const responseData = await response.json();
            console.log("FAQ Response Data:", responseData);

            const faqData = Array.isArray(responseData.body) ? responseData.body : JSON.parse(responseData.body);
            console.log("Parsed FAQ Data:", faqData);

            setFaqList(faqData);
        } catch (error) {
            console.error('Error fetching FAQ data:', error.message);
        }
    }, []);





    return { accommodations, faqList, loading, fetchAccommodations, fetchFAQ };
};

export default useFetchData;
