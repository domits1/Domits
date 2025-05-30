import { useState, useCallback } from 'react';

const useVoiceInput = (setUserInput) => {
    const [isRecording, setIsRecording] = useState(false);

    const handleVoiceInput = useCallback(() => {
        // Check if SpeechRecognition is supported
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                'Voice input is not supported in your browser. Please use a Chromium-based browser like Google Chrome.'
            );
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;

        recognition.onstart = () => setIsRecording(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setUserInput(transcript);
            setIsRecording(false);
        };

        recognition.onerror = () => {
            alert('Error occurred during voice input. Please try again.');
            setIsRecording(false);
        };

        recognition.onend = () => setIsRecording(false);

        recognition.start();
    }, [setUserInput]);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
    }, []);

    return { isRecording, handleVoiceInput, stopRecording };
};

export default useVoiceInput;
