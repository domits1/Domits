import { useState, useCallback } from 'react';

export const useUploadUrl = (userId) => {
    const getUploadUrl = async (fileType) => {
        const response = await fetch('https://d141hj02ed.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Create-UploadUrl', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileType })
        });

        if (!response.ok) {
            throw new Error('Failed to get upload URL');
        }

        return await response.json();
    };

    return { getUploadUrl };
};

export default useUploadUrl;
