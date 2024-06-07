import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentConfirm = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        // Extract query parameters from URL
        const queryParams = new URLSearchParams(location.search);
        const ID = queryParams.get('paymentID');
        const userId = queryParams.get('userId');
        const accommodationId = queryParams.get('accommodationId');
        const ownerId = queryParams.get('ownerId');
        const State = queryParams.get('State');
        const price = queryParams.get('price');
        const startDate = queryParams.get('startDate');
        const endDate = queryParams.get('endDate');

        // Construct the payload to send to the API
        const payload = {
            ID,
            userId,
            accommodationId,
            ownerId,
            State,
            price,
            startDate,
            endDate
        };
        const storeData = async () => {
            try {
                const response = await fetch('https://3zkmgnm6g6.execute-api.eu-north-1.amazonaws.com/dev/store-checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    navigate('/guestdashboard/booking');
                } else {
                    console.error('Failed to store data:', response.statusText);
                }
            } catch (error) {
                console.error('Error storing data:', error);
            }
        };

        storeData();
    }, [location, history]);

    return (
        <div>
            <h1>Processing Payment...</h1>
        </div>
    );
};

export default PaymentConfirm;
