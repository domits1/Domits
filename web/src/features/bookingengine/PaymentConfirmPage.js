import React, { useState } from 'react';
import './paymentconfirmpage.css';
import Circle from '@mui/icons-material/CheckCircleOutlineOutlined';

const PaymentConfirmPage = () => {
    const [email] = useState("lotte_summer@gmail.com");
    const [totalPrice] = useState(527.00);


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
            {accommodations.length > 0 ? (
                <ImageGallery images={Object.values(accommodations[0].images)} />
            ) : (
                <p>Loading accommodations...</p>
            )}
        </div>

            <div className="right-panel">
                <h1>Minimalistic and Cozy Place in Haarlem</h1>

                <div className="confirmInformation">
                    <div>
                        <h3>Booking Confirmed!</h3>
                        <p>You paid with Mastercard [ L.Summer ] [0123 xxxx xxxx 2345]</p>
                    </div>
                    <div className="right">
                        <Circle sx={{ fontSize: 50 }} />
                    </div>
                </div>

                <div className="display-row">
                    <p>Payment and booking details are sent to <strong>{email}</strong></p>
                    <p className="resend-confirmation">Resend confirmation</p>
                </div>

                <div className="priceContainer">
                    <h3>Price Details</h3>
                    <p><strong>2 adults – 2 kids | 3 nights</strong></p>

                    <div className="price-breakdown">
                        <div className="row">
                            <p>$140 night x 3</p>
                            <p>$420.00</p>
                        </div>
                        <div className="row">
                            <p>Cleaning Fee</p>
                            <p>$50.00</p>
                        </div>
                        <div className="row">
                            <p>Cat Tax</p>
                            <p>$17.50</p>
                        </div>
                        <div className="row">
                            <p>Domits Service Fee</p>
                            <p>$39.50</p>
                        </div>
                    </div>

                    <div className="total-price">
                        <strong>Total (DOL)</strong>
                        <strong>${totalPrice.toFixed(2)}</strong>
                    </div>
                </div>

                <button className="view-booking-button">View Booking</button>
            </div>
        </main>
    );
};

export default PaymentConfirmPage;
