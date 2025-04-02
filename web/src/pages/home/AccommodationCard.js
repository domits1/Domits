import React, {useState} from "react";
import {Swiper, SwiperSlide} from 'swiper/react';
import './Accommodations.css';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import {EffectFade, Navigation, Pagination} from 'swiper/modules';
import IosShareIcon from '@mui/icons-material/IosShare';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import BedOutlinedIcon from '@mui/icons-material/BedOutlined';

const AccommodationCard = ({ accommodation, onClick} ) => {
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

    if (!accommodation) {
        return <div>No accommodation data available.</div>;
    }

    return (
        <div className="accocard" key={accommodation.property?.id}
             onClick={(e) => onClick(e, accommodation.property?.id)}>
            <button className="accocard-share-button" onClick={(e) => handleShare(e, accommodation.property?.id)}>
                <IosShareIcon/>
            </button>
            <button className="accocard-like-button" onClick={handleLike}>
                {liked ? <FavoriteIcon sx={{color: '#ec5050'}}/> : <FavoriteBorderOutlinedIcon/>}
            </button>
            <Swiper
                spaceBetween={30}
                effect="fade"
                navigation={true}
                pagination={{clickable: true}}
                modules={[EffectFade, Navigation, Pagination]}
                className="mySwiper"
            >
                {accommodation.propertyImages?.map((img, index) => {
                    return (
                        <SwiperSlide key={index}>
                            <img src={`https://accommodation.s3.eu-north-1.amazonaws.com/${img.key}`}
                                   alt={`Accommodation ${accommodation.property?.id} - Image ${index + 1}`}/>
                        </SwiperSlide>
                    )
                })}
            </Swiper>
            <div className="accocard-content">
                <div className="accocard-title">{accommodation.property?.title || "No title available"}</div>
                <div className="accocard-price">€{accommodation.propertyPricing?.roomRate || "N/A"} per night</div>
                <div
                    className="accocard-detail">{accommodation.property?.description || "No description available"}</div>
                <div className="accocard-specs">
                    <BedOutlinedIcon/>
                    <div>
                        {accommodation.propertyGeneralDetails?.find(item => item.detail === "Bedrooms")?.value || 0} Bedroom(s)
                    </div>
                    <PeopleOutlinedIcon/>
                    <div>
                        {accommodation.propertyGeneralDetails?.find(item => item.detail === "Guests")?.value || 0} Guest(s)
                    </div>
                </div>
            </div>
        </div>
    );
};


export default AccommodationCard;
