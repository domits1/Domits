import { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';

const useUserDetails = (setMessages, fetchPollySpeech) => {
    const [userId, setUserId] = useState(null);
    const [username, setUserName] = useState('Host');

    useEffect(() => {
        const setUserDetails = async () => {
            try {
                const userInfo = await Auth.currentUserInfo();
                setUserId(userInfo.attributes.sub);
                const name = userInfo.attributes['custom:username'] || 'Host';
                setUserName(name);
                const greeting = `Hello, ${name}! Please choose an option:`;
                const messageId = Date.now();
                setMessages([{ id: messageId, text: greeting, sender: 'bot', contentType: 'text' }]);
                fetchPollySpeech(greeting, messageId);
            } catch (error) {
                console.error('Error fetching user details:', error);
            }
        };

        setUserDetails();
    }, []); // Only runs on mount

    return { userId, username };
};

export default useUserDetails;
