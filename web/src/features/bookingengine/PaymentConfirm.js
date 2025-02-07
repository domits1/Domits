import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PaymentConfirm = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [accommodationTitle, setAccommodationTitle] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const ID = queryParams.get('paymentID');
        const userId = queryParams.get('userId');
        const accommodationId = queryParams.get('accommodationId');
        const rawAccommodationTitle = queryParams.get('accommodationTitle');
        const ownerId = queryParams.get('ownerId');
        const State = queryParams.get('State');
        const price = queryParams.get('price');
        const startDate = queryParams.get('startDate');
        const endDate = queryParams.get('endDate');
        const cleaningFee = queryParams.get('cleaningFee');
        const amountOfGuest = queryParams.get('amountOfGuest');
        const taxes = queryParams.get('taxes');


        // Decode the accommodationTitle
        const decodedAccommodationTitle = decodeURIComponent(rawAccommodationTitle);
        setAccommodationTitle(decodedAccommodationTitle);

        const payload = {
            ID,
            userId,
            accommodationId,
            accommodationTitle: decodedAccommodationTitle, // Ensure to use the decoded title
            ownerId,
            State,
            price,
            startDate,
            endDate,
            cleaningFee,
            amountOfGuest,
            taxes
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
                console.log(payload)
                if (response.ok) {
                    navigate('/bookingconfirmationoverview');
                } else {
                    console.error('Failed to store data:', response.statusText);
                }
            } catch (error) {
                console.error('Error storing data:', error);
            }
        };

        storeData();
    }, [location]);

    return (
        <div>
            <h1>Processing Payment...</h1>
        </div>
    );
};

export default PaymentConfirm;
