import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

const useUserDetails = (setMessages, fetchPollySpeech) => {
    const [username, setUserName] = useState('Host');
    const { userAttributes, checkAuth } = useAuth();

    const userId = userAttributes?.sub;

    useEffect(() => {
        const setUserDetails = async () => {
            try {
                const name = userAttributes['custom:username'] || 'Host';
                setUserName(name);

                // Construct the initial greeting message
                const greeting = `Hello, ${name}! Please choose an option:`;
                const messageId = Date.now();
                setMessages([{ id: messageId, text: greeting, sender: 'bot', contentType: 'text' }]);
                fetchPollySpeech(greeting, messageId);
                
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        };

        setUserDetails();
    }, []);

    return { userId, username };
};

export default useUserDetails;
