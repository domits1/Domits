import React, {useState} from 'react'
import {Swiper, SwiperSlide} from 'swiper/react'
import './Accommodations.css'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import {EffectFade, Navigation, Pagination} from 'swiper/modules'
import IosShareIcon from '@mui/icons-material/IosShare'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import BedOutlinedIcon from '@mui/icons-material/BedOutlined'

const AccommodationCard = ({accommodation, images = [], onClick, onShare}) => {
  const [liked, setLiked] = useState(false)

  const handleLike = e => {
    e.stopPropagation()
    setLiked(!liked)
  }

  const handleShare = (e, ID) => {
    e.stopPropagation()
    const shareURL = `${window.location.origin}/listingdetails?ID=${encodeURIComponent(ID)}`
    navigator.clipboard
      .writeText(shareURL)
      .then(() => {
        alert('Gekopieerd URL: ' + shareURL)
      })
      .catch(error => {
        console.error('Kon de URL niet kopiëren:', error)
      })
  }

  if (!accommodation || !Array.isArray(images)) {
    return <div>No accommodation data available.</div>
  }

  return (
    <div
      className="accocard"
      key={accommodation.ID}
      onClick={e => onClick(e, accommodation.ID)}>
      <button
        className="accocard-share-button"
        onClick={e => handleShare(e, accommodation.ID)}>
        <IosShareIcon />
      </button>
      <button className="accocard-like-button" onClick={handleLike}>
        {liked ? (
          <FavoriteIcon sx={{color: '#ec5050'}} />
        ) : (
          <FavoriteBorderOutlinedIcon />
        )}
      </button>
      <Swiper
        spaceBetween={30}
        effect="fade"
        navigation={true}
        pagination={{clickable: true}}
        modules={[EffectFade, Navigation, Pagination]}
        className="mySwiper">
        {(images || []).map((img, index) => (
          <SwiperSlide key={index}>
            <img
              src={img}
              alt={`Accommodation ${accommodation.ID} - Image ${index + 1}`}
            />
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="accocard-content">
        <div className="accocard-title">
          {accommodation.City || 'Unknown City'},{' '}
          {accommodation.Country || 'Unknown Country'}
        </div>
        <div className="accocard-price">
          €{accommodation.Rent || 'N/A'} per night
        </div>
        <div className="accocard-detail">
          {accommodation.Description || 'No description available'}
        </div>
        <div className="accocard-specs">
          <BedOutlinedIcon />
          <div>{accommodation.Bedrooms || 0} Bedroom(s)</div>
          <PeopleOutlinedIcon />
          <div>{accommodation.GuestAmount || 0} Guest(s)</div>
        </div>
      </div>
    </div>
  )
}

export default AccommodationCard
