import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import './Accommodations.css';

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const navigate = useNavigate();

  const formatData = (items) => {
    return items.map((item) => ({
      image: item.Images.image1, // Use the image URLs from the Images object
      title: item.Title,
      details: item.Description, // Use the Description property
      size: `${item.Measurements}m²`, // Use the Measurements property
      price: `€${item.Rent} per night`, // Use the Rent property
      id: item.ID, // Use the ID property
      bathrooms: `${item.Bathrooms} Bathrooms`,
      bedrooms: `${item.Bedrooms} Bedrooms`,
      persons: `${item.Guests} Persons`, // Use the Guests property
    }));
  };

  useEffect(() => {  
    const fetchData = async () => {
      try {
        const response = await fetch('https://6jjgpv2gci.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();
        const data = JSON.parse(responseData.body); // Parse JSON from the body property
        console.log(data);
        setAccolist(formatData(data));
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      }
    };
    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
    } else {
      fetchData();
    }
  }, [searchResults]);

  const handleClick = (ID) => {
    navigate(`/dynamicListing?ID=${encodeURIComponent(ID)}`);
  };

  return (
    <div id="card-visibility">
      {accolist.map((accommodation, index) => (
        <div className="accocard" key={index} onClick={() => handleClick(accommodation.id)}>
            <img src={accommodation.image} alt={accommodation.title} />
            <div className="accocard-content">
              <div className="accocard-title">{accommodation.title}</div>
              <div className="accocard-price">{accommodation.price}</div>
              <div className="accocard-detail">{accommodation.details}</div>

              <div className="accocard-specs">
                <div className="accocard-size">{accommodation.size}</div>
                <div className="accocard-size">{accommodation.bathrooms}</div>
                <div className="accocard-size">{accommodation.bedrooms}</div>
                <div className="accocard-size">{accommodation.persons}</div>
              </div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default Accommodations;
