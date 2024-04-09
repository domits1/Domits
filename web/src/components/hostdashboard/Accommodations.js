import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import './Accommodations.css';

const Accommodations = ({ searchQuery }) => {
    const [accolist, setAccolist] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('https://cfeo8gr5y0.execute-api.eu-north-1.amazonaws.com/dev/accommodation');
            if (!response.ok) {
                throw new Error('Failed to fetch data');
            }
            const responseData = await response.json();

            const formattedData = responseData.map((item, index) => ({
                image: `https://accommodationphotos.s3.eu-north-1.amazonaws.com/${item.PhotoUrls}`,
                title: item.Title,
                details: item.description,
                size: `${item.Size}m²`,
                price: `€${item.Price} per night`,
                PK: item.PK,
                Sk: item.Sk,
                bathrooms: `${item.Bathrooms} Bathrooms`,
                bedrooms: `${item.Bedrooms} Bedrooms`,
                persons: `${item.Persons} Persons`,
            }));
            setAccolist(formattedData);
        } catch (error) {
            console.error('Error fetching or processing data:', error);
        }
    };

    const filteredAccommodations = accolist.filter(accommodation =>
        accommodation.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleClick = (pk, sk) => {
        navigate(`/listingdetails?pk=${encodeURIComponent(pk)}&sk=${encodeURIComponent(sk)}`);
    };

    return (
        <div id="card-visibility">
            {filteredAccommodations.map((accommodation, index) => (
                <div className="accocard" key={index} onClick={() => handleClick(accommodation.PK, accommodation.Sk)}>
                    <div className="accocard-link">
                        <img src={accommodation.image} alt="Product Image" />
                        <div className="accocard-content">
                            <div className="accocard-title">{accommodation.title}</div>
                            <div className="accocard-price">{accommodation.price}</div>
                            <div className="accocard-detail">{accommodation.details}</div>
                            <div className="accocard-specs">
                                <div className="accocard-size">{accommodation.size}</div>
                                <div className="accocard-size">{accommodation.bathrooms}</div>
                                <div className="accocard-size">{accommodation.bedrooms}</div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default Accommodations;
