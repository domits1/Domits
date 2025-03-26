import { useState } from 'react';
import { API } from 'aws-amplify';
import * as mutations from '../../../../graphql/mutations';

const useUpdateContactRequest = (userId, origin, channelUUID, setPendingContacts, setNotificationData) => {
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
                    body: JSON.stringify({ Id: id, Status: status }),
                }
            );

            if (!response.ok) throw new Error('Failed to update contact request');

            const data = await response.json();
            const parsedData = JSON.parse(data.body);
            console.log(`Request ${status}:`, parsedData);

            if (parsedData.isAccepted) {
                const result = await API.graphql({
                    query: mutations.createChat,
                    variables: {
                        input: {
                            text: '',
                            userId: userId,
                            recipientId: origin,
                            isRead: false,
                            createdAt: new Date().toISOString(),
                            channelID: channelUUID,
                        },
                    },
                });
                console.log('Chat created:', result);
            }

            // Update state to remove the processed contact request
            setPendingContacts((prev) => prev.filter((contact) => contact.userId !== id));
            setNotificationData((prev) => prev.filter((notification) => notification.id !== id));

            return data;
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
