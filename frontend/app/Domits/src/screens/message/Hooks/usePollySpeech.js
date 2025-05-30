import { useState, useCallback } from 'react';

const usePollySpeech = () => {
    const [messageAudios, setMessageAudios] = useState({});

    const fetchPollySpeech = useCallback(async (text, messageId) => {
        try {
            const response = await fetch(
                'https://4gcqhbseki.execute-api.eu-north-1.amazonaws.com/default/PollySpeech',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voiceId: 'Joanna' }),
                }
            );

            const responseData = await response.json();
            const audioContent = responseData?.body ? JSON.parse(responseData.body).audioContent : null;

            if (audioContent) {
                const audioUrl = `data:audio/mp3;base64,${audioContent}`;

                setMessageAudios((prevAudios) => ({
                ...prevAudios,
                [messageId]: audioUrl,
            }));
            }
        } catch (error) {
            console.error('Error fetching speech from Polly:', error);
        }
    }, []);

    return { messageAudios, fetchPollySpeech };
};

export default usePollySpeech;
