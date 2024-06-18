// src/Callback.js

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const Callback = () => {
    const location = useLocation();

    useEffect(() => {
        const fetchToken = async (code) => {
            try {
                const response = await axios.post('https://your-api-endpoint.com/stripe-oauth', { code });
                console.log(response.data);
            } catch (error) {
                console.error('Error fetching the token:', error);
            }
        };

        const params = new URLSearchParams(location.search);
        const code = params.get('code');

        if (code) {
            fetchToken(code);
        }
    }, [location]);

    return (
        <div>
            <h1>Callback Page</h1>
        </div>
    );
};

export default Callback;
