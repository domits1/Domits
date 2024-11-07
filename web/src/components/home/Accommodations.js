import React, { useState, useEffect } from "react";
import { Storage } from 'aws-amplify';
import './Accommodations.css';
import PageSwithcher from '../utils/PageSwitcher.module.css';

import SkeletonLoader from '../base/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import IosShareIcon from '@mui/icons-material/IosShare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';

// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { EffectFade, Navigation, Pagination } from 'swiper/modules';


const getItemsPerPage = () => {
  if (window.matchMedia("(max-width: 480px)").matches) {
    return 8;
  } else if (window.matchMedia("(max-width: 856px)").matches) {
    return 12;
  } else if (window.matchMedia("(max-width: 1292px)").matches) {
    return 16;
  } else {
    return 15;
  }
};


const Accommodations = ({ searchResults }) => {
  const S3_BUCKET_NAME = 'accommodation';
  const region = 'eu-north-1';
  const [accolist, setAccolist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(getItemsPerPage());

  const totalPages = Math.ceil(accolist.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const displayedAccolist = accolist.slice(startIndex, endIndex);
  const [allAccommodationImages, setAllAccommodationImages] = useState([])

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(getItemsPerPage());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const formatData = (items) => {
    return items.map((item) => {
      const isBoatOrCamper = item.AccommodationType === 'Boat' || item.AccommodationType === 'Camper';
      const priceLabel = isBoatOrCamper ? 'per day' : 'per night';

      return {
        image: item.images || item.Images['homepage'] ,
        title: item.Title,
        city: item.City,
        country: item.Country,
        details: item.Description,
        price: `€${item.Rent} ${priceLabel}`,
        id: item.ID,
        beds: `${item.Beds} Bed(s)`,
        bedrooms: `${item.AccommodationType === 'Boat' ? item.Cabins : item.Bedrooms} ${item.AccommodationType === 'Boat' ? 'Cabins' : 'Bedrooms'}`,
        persons: `${item.GuestAmount} ${item.GuestAmount > 1 ? 'People' : 'Person'}`,
      };
    });
  };

  const populateAccoListWithImages = async (data) => {
    const formattedData = await Promise.all(
        data.map(async (item) => {
          const imageUrls = [];

          for (let i = 1; i <= 5; i++) {
            const webpURL = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/images/${item.OwnerId}/${item.ID}/homepage/Image-${i}.webp`;
            const jpegURL = `https://${S3_BUCKET_NAME}.s3.${region}.amazonaws.com/images/${item.OwnerId}/${item.ID}/homepage/Image-${i}.jpg`;

            if (await checkImageExists(webpURL)) {
              imageUrls.push(webpURL);
            } else if (await checkImageExists(jpegURL)) {
              imageUrls.push(jpegURL);
            }
          }

          console.log(`Images for item ${item.ID}:`, imageUrls);

          return {
            ...item,
            images: imageUrls.length > 0 ? imageUrls : [item.Images['image1']],
          };
        })
    );

    setAccolist(formatData(formattedData));
  };


  const checkImageExists = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok; // Return true als de afbeelding bestaat
    } catch {
      return false; // Return false als er een fout is
    }
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
        await populateAccoListWithImages(data);
        const  test =  await  populateAccoListWithImages(data);


      } catch (error) {
        console.error('Error fetching or processing data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (searchResults && searchResults.length > 0) {
      setAccolist(formatData(searchResults));
      setCurrentPage(1);
    } else {
      fetchData();
    }
  }, [searchResults]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  if (loading) {
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

  const handleClick = (ID) => {
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
            alert('URL is copied to clipboard!' + shareURL);
          })
          .catch((error) => {
            console.error('Could not copy the URL:', error);
          });
    };

    console.log("accomodation: ",accommodation)

    return (
        <div className="accocard" key={accommodation.id} onClick={() => handleClick(accommodation.id)}>
          <button className="accocard-share-button" onClick={(e) => handleShare(e, accommodation.id)}>
            <IosShareIcon />
          </button>
          <button
              className="accocard-like-button"
              onClick={handleLike}
          >
            {liked ? <FavoriteIcon sx={{ color: '#ec5050' }} /> : <FavoriteBorderOutlinedIcon  />}
          </button>
          <>
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
              <SwiperSlide>
                <img src={accommodation.image[0]} />
              </SwiperSlide>
              <SwiperSlide>
                <img src={accommodation.image[1]} />
              </SwiperSlide>
              <SwiperSlide>
                <img src={accommodation.image[2]} />
              </SwiperSlide>
              <SwiperSlide>
                <img src={accommodation.image[3]} />
              </SwiperSlide>
              <SwiperSlide>
                <img src={accommodation.image[4]} />
              </SwiperSlide>
            </Swiper>
          </>
          <div className="accocard-content">
            <div className="accocard-title">
              {accommodation.city}, {accommodation.country}
            </div>
            <div className="accocard-price">{accommodation.price}</div>
            <div className="accocard-detail">{accommodation.details}</div>
            <div className="accocard-specs">
              <div className="accocard-size">{accommodation.bedrooms}</div>
              <div className="accocard-size">{accommodation.persons}</div>
            </div>
          </div>
        </div>
    );
  };

  return (
      <div id="card-visibility">
        {displayedAccolist.map((accommodation) => (
            <AccommodationCard key={accommodation.id} accommodation={accommodation} />
        ))}
        {/* Pagination */}
        <div className={PageSwithcher.pagination}>
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
            &lt; Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
              <button
                  key={i}
                  onClick={() => handlePageChange(i + 1)}
                  className={`${currentPage === i + 1 && PageSwithcher.active}`}
              >
                {i + 1}
              </button>
          ))}
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            Next &gt;
          </button>
        </div>
        <div className="why-domits-button">
          <a href="/why-domits" className="why-domits-link">
            Why Domits?
          </a>
        </div>
      </div>
  );
};

export default Accommodations;
