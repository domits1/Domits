import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './paymentconfirmpage.css';
import ImageGallery from "./ImageGallery";

const PaymentConfirmPage = () => {
    const [accommodations, setAccommodations] = useState([]);



    const fetchAccommodationsById = async () => {
        if (!userId) return;

        setLoading(true);
        try {
            const response = await fetch(
                'https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation',
                {
                    method: 'POST',
                    body: JSON.stringify({ OwnerId: userId }),
                    headers: { 'Content-type': 'application/json; charset=UTF-8' },
                }
            );
            const data = await response.json();
            const accommodationsArray = data.body ? JSON.parse(data.body) : [];

            const formattedAccommodations = accommodationsArray.map((acc) => ({
                id: acc.ID,
                title: acc.Title || 'Accommodation',
                city: acc.City,
                bathrooms: acc.Bathrooms,
                guestAmount: acc.GuestAmount,
                images: acc.Images || {},
            }));

            setAccommodations(formattedAccommodations);
            if (currentOption === '1') {
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { text: 'Here are your accommodations:', sender: 'bot', contentType: 'accommodation' },
                ]);
            }
        } catch (error) {
            console.error('Error fetching accommodations:', error);
        } finally {
            setLoading(false);
        }
    };


    return (
        <main className="PaymentOverview">
        <div className="left-side">
            {/*<ImageGallery images={Object.values(accommodation.Images)} />*/}
        </div>

        <div className="right-side">

        </div>
            <p>halllo0okdfpokdgosdgs</p>
            <h1>adsofvnkdijgvnjdsagvsadv</h1>

        </main>

    );
}

export default PaymentConfirmPage;
