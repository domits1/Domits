import React, { useState, useEffect } from "react";
import './Accommodations.css';
import PageSwitcher from '../utils/PageSwitcher.module.css';

import SkeletonLoader from '../base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import IosShareIcon from '@mui/icons-material/IosShare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';


import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { EffectFade, Navigation, Pagination } from 'swiper/modules';

const Accommodations = ({ searchResults }) => {
  const [accolist, setAccolist] = useState([]);
  const [accommodationImages, setAccommodationImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingImages, setLoadingImages] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
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

  const AccommodationCard = ({ accommodation }) => {
    const [liked, setLiked] = useState(false);

    const handleLike = (e) => {
      e.stopPropagation();
      setLiked(!liked);
    };

    const handleShare = (e, ID) => {
      e.stopPropagation();
      const shareURL = `${window.location.origin}/listingdetails?ID=${encodeURIComponent(ID)}`;
      navigator.clipboard
          .writeText(shareURL)
          .then(() => {
            alert('Gekopieerd URL: ' + shareURL);
          })
          .catch((error) => {
            console.error('Kon de URL niet kopiëren:', error);
          });
    };

    // Verwerk de `Images`-property om een array te maken
    const images = accommodationImages
        .find((img) => img.ID === accommodation.ID)?.Images || {};

    const imageArray = Object.values(images); // Zet het `Images`-object om naar een array

    return (

        <div className="accocard" key={accommodation.ID} onClick={(e) => handleClick(e, accommodation.ID)}>
          <button className="accocard-share-button" onClick={(e) => handleShare(e, accommodation.ID)}>
            <IosShareIcon />
          </button>
          <button className="accocard-like-button" onClick={handleLike}>
            {liked ? <FavoriteIcon sx={{ color: '#ec5050' }} /> : <FavoriteBorderOutlinedIcon />}
          </button>
          <Swiper
              spaceBetween={30}
              effect={'fade'}
              navigation={true}
              pagination={{
                clickable: true,
              }}
              modules={[EffectFade, Navigation, Pagination]}
              className="mySwiper"
          >
            {imageArray.map((img, index) => (
                <SwiperSlide key={index} >
                  <img src={img} alt={`Accommodation ${accommodation.ID} - Image ${index + 1}`} />
                </SwiperSlide>
            ))}
          </Swiper>
          <div className="accocard-content">
            <div className="accocard-title">
              {accommodation.City}, {accommodation.Country}
            </div>
            <div className="accocard-price">€{accommodation.Rent} per night</div>
            <div className="accocard-detail">{accommodation.Description}</div>
            <div className="accocard-specs">
              <div>{accommodation.Bedrooms} Bedroom(s)</div>
              <div>{accommodation.GuestAmount} Guest(s)</div>
            </div>
          </div>
        </div>
    );
  };

  return (
    <div id="card-visibility">
      {displayedAccolist.length > 0 ? (
        displayedAccolist.map((accommodation) => (
          <AccommodationCard key={accommodation.ID} accommodation={accommodation} />
        ))
      ) : (
        <div className="no-results">No accommodations found for your search.</div>
      )}
      <div className={PageSwitcher.pagination}>
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
          &lt; Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => handlePageChange(i + 1)}
            className={`${currentPage === i + 1 && PageSwitcher.active}`}
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
