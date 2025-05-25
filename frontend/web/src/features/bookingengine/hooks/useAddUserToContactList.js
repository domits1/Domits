import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const useAddUserToContactList = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);



    const addUserToContactList = async (userID, hostID, status, accoId) => {

        const contactListId = uuidv4();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const response = await fetch('https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/AddUserToContactList', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userID,
                    hostID,
                    ID: contactListId,
                    Status: status,
                    AccoId: accoId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to add user to contact list');
            }

            const data = await response.json();
            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        success,
        addUserToContactList,
    };
};

export default useAddUserToContactList;
