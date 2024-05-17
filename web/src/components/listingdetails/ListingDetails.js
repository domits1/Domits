import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./listing.css";
import ImageGallery from './ImageGallery';

const ListingDetails = () => {
    const { search } = useLocation();
    const searchParams = new URLSearchParams(search);
    const id = searchParams.get('ID');
    const [accommodation, setAccommodation] = useState(null);
    const navigate = useNavigate();


  

    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ ID: id })
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }
                const responseData = await response.json();
                const data = JSON.parse(responseData.body)
                setAccommodation(data);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };
        fetchAccommodation();
    }, [id]);

    const handleStartChat = () => {
        // Assuming you have the user's email available
        const userEmail = "nabilsalimi0229@gmail.com";
        const recipientEmail = "33580@ma-web.nl"; // Change this to the actual owner email field
        navigate(`/chat?recipient=${recipientEmail}`);
    };


    return (
        <div className="listing-details-container">
            {accommodation && (
                <div className="booking-information-section">
                    <div className="listing-details-top">
                        <div className="listing-details-back-arrow">
                            <Link to="/">
                                <button>Back</button>
                            </Link>
                        </div>
                        <h1 className="listing-details-title">
                            {accommodation.Title}
                        </h1>
                    </div>
                    <div className="listing-details-image-window">
                        <ImageGallery images={Object.values(accommodation.Images)} />
                    </div>
                    <div className="price-and-rooms-row">
                        <p className="price-per-night-text">{`€${accommodation.Rent} per night`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.GuestAmount} guests`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Beds} beds`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Bedrooms} bedrooms`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Bathrooms} bathrooms`}</p>
                        <div className="listing-details-book-button">
                            <button>Book Now</button>
                        </div>
                    </div>
                    <div className="listing-details-services-container">
                        <div className="listing-description">
                            <p>{accommodation.Description}</p>
                        </div>
                        <h3 className="listing-details-services-header">This place offers the following:</h3>
                        <ul className="listing-details-place-offers">
                            {Object.entries(accommodation.Features).map(([feature, value]) => (
                                <li key={feature} className="listing-details-offer-item">
                                    <span>{value ? '✓' : '✗'}</span> {feature}
                                </li>
                            ))}
                        </ul>
                        <div className="show-more-button">
                            <button>Show more</button>
                            <button onClick={handleStartChat}>Start Chat</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ListingDetails;
