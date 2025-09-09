import { useState, useCallback } from 'react';
import axios from 'axios';

const usePollySpeech = () => {
    const [messageAudios, setMessageAudios] = useState({});

    const fetchPollySpeech = useCallback(async (text, messageId) => {
        try {
            const response = await axios.post(
                'https://4gcqhbseki.execute-api.eu-north-1.amazonaws.com/default/PollySpeech',
                { text, voiceId: 'Joanna' },
                { headers: { 'Content-Type': 'application/json' } }
            );

            const audioContent = response.data?.body ? JSON.parse(response.data.body).audioContent : null;
            if (audioContent) {
                setMessageAudios((prevAudios) => ({
                    ...prevAudios,
                    [messageId]: `data:audio/mp3;base64,${audioContent}`,
                }));
            }
        } catch (error) {
            console.error('Error fetching speech from Polly:', error);
        }
    }, []); // UseCallback ensures fetchPollySpeech is stable

    return { messageAudios, fetchPollySpeech };
};

export default usePollySpeech;
