import React, { useState, useEffect } from "react";
import './Accommodations.css';
import SkeletonLoader from '../base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import CheckoutFrontend from "../checkout/CheckoutFrontEnd";

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(accolist.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const displayedAccolist = accolist.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
};

  const formatData = (items) => {
    return items.map((item) => ({
      image: item.Images.image1,
      title: item.Title,
      city: item.City,
      country: item.Country,
      details: item.Description,
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
      {/* <CheckoutFrontend/> */}
      {displayedAccolist.map((accommodation) => (
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
      {/* Pagination */}
      <div className="pagination">
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          &lt; Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => handlePageChange(i + 1)}
            className={currentPage === i + 1 ? "active" : ""}
          >
            {i + 1}
          </button>
        ))}
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          Next &gt;
        </button>
      </div>
    </div>
  );
};

export default Accommodations;
