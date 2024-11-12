import { useState, useCallback } from 'react';

const useVoiceInput = (setUserInput) => {
    const [isRecording, setIsRecording] = useState(false);

    const handleVoiceInput = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;

        recognition.onstart = () => setIsRecording(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
            setIsRecording(false);
        };

        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);

        recognition.start();
    }, [setUserInput]);

    return { isRecording, handleVoiceInput };
};

export default useVoiceInput;
