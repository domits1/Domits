import React, { useState, useEffect } from "react";
import './Accommodations.css';
import PageSwitcher from '../../utils/PageSwitcher.module.css';

import SkeletonLoader from '../../components/base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import AccommodationCard from "./AccommodationCard";
import Filtersfunction from "./Filtersfunction";


const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const [accommodationImages, setAccommodationImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15; // Number of items per page
  const navigate = useNavigate();

  const totalPages = Math.ceil(accolist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const displayedAccolist = accolist.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchAllAccommodations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/ReadAccommodation'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch accommodation data');
      }
      const data = JSON.parse((await response.json()).body);
      setAccolist(data);
    } catch (error) {
      console.error('Error fetching accommodation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccommodationImages = async () => {
    try {
      setLoadingImages(true);
      const response = await fetch(
        'https://lhp0t08na7.execute-api.eu-north-1.amazonaws.com/prod/getAllAccommodationImages'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch accommodation images');
      }
      const data = await response.json();
      setAccommodationImages(data);
    } catch (error) {
      console.error('Error fetching accommodation images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    // If there are search results, update the list, otherwise fetch all accommodations
    if (searchResults && searchResults.length > 0) {
      setAccolist(searchResults);
      setCurrentPage(1); // Reset to the first page for new search results
    } else {
      fetchAllAccommodations();
      fetchAccommodationImages();
    }
  }, [searchResults]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  if (loading || loadingImages) {
    return (
      <div className="full-visibility">
        {Array(8)
          .fill()
          .map((_, index) => (
            <SkeletonLoader key={index} />
          ))}
      </div>
    );
  }

  const handleClick = (e, ID) => {
    if (!e || !e.target) {
      console.error('Event or event target is undefined.');
      return;
    }
    if (e.target.closest('.swiper-button-next') || e.target.closest('.swiper-button-prev')) {
      e.stopPropagation();
      return;
    }
    navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
  };


  return (
    <div id="card-visibility">
      {displayedAccolist.length > 0 ? (
        displayedAccolist.map((accommodation) => {
          const images =
            accommodationImages.find((img) => img.ID === accommodation.ID)?.Images || [];
          return (
            <AccommodationCard
              key={accommodation.ID}
              accommodation={accommodation}
              images={Object.values(images)}
              onClick={handleClick}
            />
          );
        })
      ) : (
        <div className="no-results">No accommodations found for your search.</div>
      )}
      <div className={PageSwitcher.pagination}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lt; Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => handlePageChange(i + 1)}
            className={`${currentPage === i + 1 ? PageSwitcher.active : ''}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
};

export default Accommodations;
