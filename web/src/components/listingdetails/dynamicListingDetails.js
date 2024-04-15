import React, { useState, useEffect } from 'react';
import { useParams } from "react-router-dom";
import "./listingdetails.css";
import ImageGallery from 'react-image-gallery';
import "react-image-gallery/styles/css/image-gallery.css";

const ListingDetails = () => {
    const { id } = useParams();
    const [accommodation, setAccommodation] = useState(null);

    useEffect(() => {
        const fetchAccommodation = async () => {
            try {
                const response = await fetch(`https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation/${id}`); // Replace 'API' with your actual API endpoint
                if (!response.ok) {
                    throw new Error('Failed to fetch accommodation data');
                }
                const data = await response.json();
                setAccommodation(data);
            } catch (error) {
                console.error('Error fetching accommodation data:', error);
            }
        };

        fetchAccommodation();
    }, [id]);

    return (
        <div className="listing-details-container">
            {accommodation && (
                <div className="booking-information-section">
                    <div className="listing-details-top">
                        <div className="listing-details-back-arrow">
                            {/* Back button */}
                        </div>
                        <h1 className="listing-details-title">
                            {accommodation.Title}
                        </h1>
                    </div>
                    <div className="listing-details-image-window">
                        {/* Image gallery */}
                    </div>
                    <div className="price-and-rooms-row">
                        <p className="price-per-night-text">{`€${accommodation.Rent} per night`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Guests} guests`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Beds} beds`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Bedrooms} bedrooms`}</p>
                        <p className="guest-and-rooms-text">{`${accommodation.Bathrooms} bathrooms`}</p>
                        <div className="listing-details-book-button">
                            {/* Book button */}
                        </div>
                    </div>
                    <div className="listing-details-services-container">
                        <div className="listing-details-hostDetails">
                            {/* Host details */}
                        </div>
                        <div className="listing-description">
                            <p>{accommodation.Description}</p>
                        </div>
                        <h3 className="listing-details-services-header">This place offers the following:</h3>
                        <ul className="listing-details-place-offers">
                            {/* List of amenities */}
                        </ul>
                        <div className="show-more-button">
                            {/* Show more button */}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default ListingDetails;
