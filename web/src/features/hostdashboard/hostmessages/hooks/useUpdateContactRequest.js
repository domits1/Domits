import { useState } from 'react';

const useUpdateContactRequest = (setContacts) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const updateContactRequest = async (id, status) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                'https://ofegu64x64.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Update-ContactRequests',
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ Status: status, Id: id }),
                }
            );

            const data = await response.json();
            setContacts((prevContacts) => {
                const updatedContacts = prevContacts.filter(contact => contact.ID !== id);
                return updatedContacts;
            });

        } catch (error) {
            console.error('Error updating contact request:', error);
            setError(error.message);
            window.alert('Error: Failed to update the contact request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return { updateContactRequest, loading, error };
};

export default useUpdateContactRequest;
