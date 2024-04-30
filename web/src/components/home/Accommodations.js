import React, { useState, useEffect } from "react";
import './Accommodations.css';
import SkeletonLoader from '../base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const formatData = (items) => {
    return items.map((item) => ({
      image: item.Images.image1,
      title: item.Title,
      city: item.City,
      country: item.Country,
      details: item.Description,
      size: `${item.Measurements}m²`,
      price: `€${item.Rent} per night`,
      id: item.ID,
      bathrooms: `${item.Bathrooms} Bathrooms`,
      bedrooms: `${item.Bedrooms} Bedrooms`,
      persons: `${item.GuestAmount} Persons`,
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
        const data = JSON.parse(responseData.body);
        // console.log(data);
        setAccolist(formatData(data));
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
    } else {
      fetchData();
    }
  }, [searchResults]);

  if (loading) {
    return (
      <div className="full-visibility">
        {Array(8).fill().map((_, index) => (
          <SkeletonLoader key={index} />
        ))}
      </div>
    );
  }


  const handleClick = (ID) => {
    navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
  };

  return (
    <div id="card-visibility">
      {accolist.map((accommodation) => (
        <div className="accocard" key={accommodation.id} onClick={() => handleClick(accommodation.id)}>
          <img src={accommodation.image} alt={accommodation.title} />
          <div className="accocard-content">
            <div className="accocard-title">{accommodation.city}, {accommodation.country}</div>
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
