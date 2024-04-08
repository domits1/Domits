import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './Accommodations.css';

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);

  const formatData = (items) => {
    return items.map((item) => ({
      image: `https://accommodationphotos.s3.eu-north-1.amazonaws.com/${item.PhotoUrls}`,
      title: item.Title,
      details: item.description, // Zorg dat deze naam overeenkomt met je API structuur
      size: `${item.Size}m²`,
      price: `€${item.Price} per night`,
      id: item['#PK'], // Zorg dat deze naam overeenkomt met je API structuur
      bathrooms: `${item.Bathrooms} Bathrooms`,
      bedrooms: `${item.Bedrooms} Bedrooms`,
      persons: `${item.Persons} Persons`,
    }));
  };

  useEffect(() => {
    // console.log('Nieuwe searchResults ontvangen in Accommodations:', searchResults);

    const fetchData = async () => {
      try {
        const response = await fetch('https://cfeo8gr5y0.execute-api.eu-north-1.amazonaws.com/dev/accommodation');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const responseData = await response.json();
        setAccolist(formatData(responseData));
      } catch (error) {
        console.error('Error fetching or processing data:', error);
      }
    };

    // Gebruik dezelfde formatData-functie voor zowel ophalen als bijwerken
    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
    } else {
      fetchData();
    }
  }, [searchResults]);

  return (
    <div id="card-visibility">
      {accolist.map((accommodation, index) => (
        <div className="accocard" key={index}>
          <Link to={`/listingdetails/`} className="accocard-link">
            <img src={accommodation.image} alt={accommodation.title} />
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
          </Link>
        </div>
      ))}
    </div>
  );
};

export default Accommodations;
