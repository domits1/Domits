import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StripeCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        // Log the URL parameters for debugging
        console.log("URL Params:", window.location.search);
        console.log("Code:", code);
        console.log("State:", state);

        if (code && state) {
            // If both code and state are present, send them to the backend
            fetch('https://jhkeknu1w3.execute-api.eu-north-1.amazonaws.com/dev', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, state }),
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        console.error("Error from backend:", data.error);
                    } else {
                        console.log("Success:", data);
                        navigate('/success'); // Redirect to a success page or update the UI as needed
                    }
                })
                .catch(error => {
                    console.error("OAuth Error:", error);
                });
        } else {
            // If code or state are missing, log an error
            console.error("No code or state in URL parameters");
        }
    }, [navigate]);

    return (
        <div>
            <h1>Handling Stripe OAuth Callback</h1>
            <p>Please wait...</p>
        </div>
    );
};

export default StripeCallback;
