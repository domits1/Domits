import React, { useState, useEffect } from "react";
import './Accommodations.css';
import PageSwitcher from '../../utils/PageSwitcher.module.css';

import SkeletonLoader from '../../components/base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import AccommodationCard from "./AccommodationCard";
import FilterUi from "./FilterUi";
import {FetchAllPropertyTypes} from "./services/fetchProperties";

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const [accommodationImages, setAccommodationImages] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

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

  const handleFilterApplied = (filteredResults) => {
    setFilterLoading(true);
    
    // Small timeout to ensure the loader is displayed
    setTimeout(() => {
      setAccolist(filteredResults);
      setCurrentPage(1);
      setFilterLoading(false);
    }, 500);
  };

  useEffect(() => {
    async function loadData() {
      setSearchLoading(true);
      // If there are search results, update the list, otherwise fetch all accommodations
      if (searchResults && searchResults.length > 0) {
        setTimeout(() => {
          setAccolist(searchResults);
          setCurrentPage(1);
          setSearchLoading(false);
        }, 500);
      } else {
        const properties = await FetchAllPropertyTypes();
        setAccolist(properties);
      }
      setSearchLoading(false);
    }
    loadData();
  }, [searchResults]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  if (filterLoading || searchLoading) {
    return (
      <div id="container">
        <div id="filters-sidebar">
          <FilterUi onFilterApplied={handleFilterApplied} />
        </div>
        <div id="card-visibility">
          {Array(12)
            .fill()
            .map((_, index) => (
              <SkeletonLoader key={index} />
            ))}
        </div>
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
  return <>(
    <div id="container">
      <div id="filters-sidebar">
        <FilterUi onFilterApplied={handleFilterApplied} />
      </div>
      <div id="card-visibility">
        {displayedAccolist.length > 0 ? (
          displayedAccolist.map((accommodation) => {
            return (
              <AccommodationCard
                key={accommodation.ID}
                accommodation={accommodation}
                onClick={handleClick}
              />
            );
          })
        ) : (
          <div className="no-results">No accommodations found for your search.</div>
        )}
       
      </div>
    </div>
  );
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
  </>
};

export default Accommodations;