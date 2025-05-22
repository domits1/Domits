import { useState, useCallback } from 'react';

export const useUploadUrl = (userId) => {
    const [uploadUrl, setUploadUrl] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getUploadUrl = useCallback(async (file) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('https://d141hj02ed.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-UploadUrl', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fileType: file })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }
            const data = await response.json();
            setUploadUrl(data.uploadUrl);
            setFileUrl(data.fileUrl);
            return data;
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return { uploadUrl, fileUrl, loading, error, getUploadUrl };
}

export default useUploadUrl;
