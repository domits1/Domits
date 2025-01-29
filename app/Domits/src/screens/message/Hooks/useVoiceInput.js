import { useState, useCallback, useEffect } from 'react';
// import Voice from '@react-native-voice/voice';
import Voice from 'react-native-voice';
import { NativeModules } from 'react-native';

const useVoiceInput = (setUserInput) => {
    const [isRecording, setIsRecording] = useState(false);



    useEffect(() => {
        if (!Voice) {
            console.error('Voice module is null or undefined.');
            return;
        }

        try {
            const onSpeechStart = () => setIsRecording(true);
            const onSpeechEnd = () => setIsRecording(false);
            const onSpeechResults = (event) => {
                
                if (event.value && event.value.length > 0) {
                    setUserInput(event.value[0]);
                } else {
                    console.log('No speech results found');
                }
            };
            const onSpeechError = (error) => {
                console.error('Voice Error:', error);
                setIsRecording(false);
            };

            Voice.onSpeechStart = onSpeechStart;
            Voice.onSpeechEnd = onSpeechEnd;
            Voice.onSpeechResults = onSpeechResults;
            Voice.onSpeechError = onSpeechError;

            return () => {
                Voice.onSpeechStart = null;
                Voice.onSpeechEnd = null;
                Voice.onSpeechResults = null;
                Voice.onSpeechError = null;
                Voice.destroy().then(Voice.removeAllListeners).catch((err) => {
                    // console.error('Error cleaning up Voice listeners:', err);
                });
            };
        } catch (setupError) {
            console.error('Voice listener setup error:', setupError);
        }
    }, [setUserInput]);

    const handleVoiceInput = useCallback(async () => {
        try {
            setIsRecording(true);
            await Voice.start('en-US');
        } catch (error) {
            console.error('Voice Input Error:', error);
            setIsRecording(false);
        }
    }, []);

    return { isRecording, handleVoiceInput };
};

export default useVoiceInput;
