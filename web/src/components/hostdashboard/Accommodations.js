import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import './Accommodations.css';
import SkeletonLoader from '../base/SkeletonLoader'; // Zorg ervoor dat dit component bestaat

const Accommodations = ({ searchResults, loading }) => {
  const [accolist, setAccolist] = useState([]);

  const formatData = (items) => {
    return items.map((item) => ({
      image: `https://accommodationphotos.s3.eu-north-1.amazonaws.com/${item.PhotoUrls}`,
      title: item.Title,
      details: item.description,
      size: `${item.Size}m²`,
      price: `€${item.Price} per night`,
      id: item['#PK'],
      bathrooms: `${item.Bathrooms} Bathrooms`,
      bedrooms: `${item.Bedrooms} Bedrooms`,
      persons: `${item.Persons} Persons`,
    }));
  };

  useEffect(() => {
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

    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
    } else {
      fetchData();
    }
  }, [searchResults]);

  if (loading) {
    return (
      <div id="card-visibility">
        {Array(8).fill().map((_, index) => <SkeletonLoader key={index} />)}
      </div>
    );
  }

  return (
    <div id="card-visibility">
      {accolist.length > 0 ? (
        accolist.map((accommodation, index) => (
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
        ))
      ) : (
        <div className="no-results">Geen accommodaties gevonden</div>
      )}
    </div>
  );
};

export default Accommodations;