import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StripeCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
    })
}
