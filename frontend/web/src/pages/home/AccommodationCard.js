import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { EffectFade, Navigation, Pagination } from "swiper/modules";
import IosShareIcon from "@mui/icons-material/IosShare";
import ShareModal from "../../features/bookingengine/components/ShareModal";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import BedOutlinedIcon from "@mui/icons-material/BedOutlined";
import { getAccessToken } from "../../features/guestdashboard/utils/authUtils";
import WishlistChoice from "../../features/guestdashboard/components/WishlistChoice";
import {
  updateWishlistItem,
  isPropertyInAnyWishlist,
} from "../../features/guestdashboard/services/wishlistService";
import { resolveAccommodationImageUrls } from "../../utils/accommodationImage";
import { getListingPricingBreakdown } from "../../features/bookingengine/listingdetails/utils/pricing";
import Toast from "../../components/toast/Toast";

const EURO_SYMBOL = "\u20AC";
const formatEuroAmount = (value) =>
  `${EURO_SYMBOL}${Number(value || 0).toFixed(2)}`;

const AccommodationCard = ({ accommodation = null, onClick, onUnlike }) => {
  const [liked, setLiked] = useState(false);
  const [likedWishlistName, setLikedWishlistName] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [toast, setToast] = useState({ message: "", status: "" });

  useEffect(() => {
    const checkIfLiked = async () => {
      const token = getAccessToken();
      if (!token) return;

      const propertyId = accommodation?.property?.id;
      if (!propertyId) return;

      try {
        const { liked: isLiked, wishlistName } = await isPropertyInAnyWishlist(propertyId);
        setLiked(isLiked);
        setLikedWishlistName(wishlistName);
      } catch {
        setLiked(false);
        setLikedWishlistName(null);
      }
    };

    checkIfLiked();
  }, [accommodation]);

  const handleLike = async (e) => {
    e.stopPropagation();

    const token = getAccessToken();
    if (!token) return;

    const propertyId = accommodation?.property?.id;
    if (!propertyId) return;

    const method = liked ? "DELETE" : "POST";

    try {
      await updateWishlistItem(propertyId, method, likedWishlistName ?? undefined);
      setLiked((prev) => !prev);

      if (method === "POST") {
        setShowPopup(true);
        setToast({ message: "Added to wishlist", status: "success" });
      } else {
        setLikedWishlistName(null);
        setToast({ message: "Removed from wishlist", status: "info" });
        if (onUnlike) onUnlike(propertyId);
      }
    } catch {
      setToast({ message: "Failed to update wishlist. Please try again.", status: "error" });
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleCardClick = (e, propertyId) => {
    onClick(e, propertyId);
  };

  if (!accommodation) {
    return <div>No accommodation data available.</div>;
  }

  const propertyId = accommodation?.property?.id;
  const propertyTitle = accommodation?.property?.title || "Accommodation";

  const shareUrl = `${globalThis.location.origin}/listingdetails?ID=${encodeURIComponent(
    propertyId,
  )}`;

  const cardImages = resolveAccommodationImageUrls(
    accommodation.propertyImages,
    "thumb",
  );

  const { nightlyDisplayPrice } = getListingPricingBreakdown(
    accommodation.propertyPricing,
    1,
  );

  return (
    <div className="accocard-wrapper">
      <div className="accocard">
        {/* CLICKABLE CONTENT */}
        <a
          className="accocard-content"
          href={`/listingdetails?ID=${encodeURIComponent(propertyId)}`}
          onClick={(e) => {
            e.preventDefault();
            handleCardClick(e, propertyId);
          }}
          aria-label={`View property ${propertyTitle}`}
        >
          {/* IMAGE / SWIPER */}
          <div className="accocard-media">
            <Swiper
              spaceBetween={30}
              effect="fade"
              navigation
              pagination={{ clickable: true }}
              loop
              modules={[EffectFade, Navigation, Pagination]}
              className="mySwiper"
            >
              {cardImages.map((imgSrc, index) => (
                <SwiperSlide key={imgSrc}>
                  <img
                    src={imgSrc}
                    alt={`${propertyTitle} ${index + 1}`}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
          <div className="accocard-title">
            {accommodation.property?.title || "No title available"}
          </div>

          <div className="accocard-price">
            {formatEuroAmount(nightlyDisplayPrice)} per night
          </div>

          <div className="accocard-detail">
            {accommodation.property?.description || "No description available"}
          </div>

          <div className="accocard-specs">
            <BedOutlinedIcon />
            <div>
              {accommodation.propertyGeneralDetails?.find(
                (item) => item.detail === "Bedrooms",
              )?.value || 0}{" "}
              Bedroom(s)
            </div>

            <PeopleOutlinedIcon />
            <div>
              {accommodation.propertyGeneralDetails?.find(
                (item) => item.detail === "Guests",
              )?.value || 0}{" "}
              Guest(s)
            </div>
          </div>
        </a>
      </div>

      {/* SHARE BUTTON */}
      <button
        type="button"
        className="accocard-share-button"
        onClick={handleShare}
        aria-label="Share property"
      >
        <IosShareIcon />
      </button>

      {/* LIKE BUTTON */}
      <button
        type="button"
        className="accocard-like-button"
        onClick={handleLike}
        aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
      >
        {liked ? (
          <FavoriteIcon sx={{ color: "#ec5050" }} />
        ) : (
          <FavoriteBorderOutlinedIcon />
        )}
      </button>

      {/* POPUPS */}
      {showPopup && (
        <WishlistChoice
          propertyId={propertyId}
          activeList="My next trip"
          show={showPopup}
          onClose={() => setShowPopup(false)}
          onSave={(listName) => setLikedWishlistName(listName)}
        />
      )}

      {showShareModal && (
        <ShareModal
          url={shareUrl}
          title={accommodation.property?.title}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {toast.message &&
        ReactDOM.createPortal(
          <Toast
            message={toast.message}
            status={toast.status || "info"}
            onClose={() => setToast({ message: "", status: "" })}
          />,
          document.body,
        )}
    </div>
  );
};

AccommodationCard.propTypes = {
  accommodation: PropTypes.shape({
    property: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      title: PropTypes.string,
      description: PropTypes.string,
    }),
    propertyImages: PropTypes.array,
    propertyPricing: PropTypes.shape({
      roomRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      cleaning: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    propertyGeneralDetails: PropTypes.arrayOf(
      PropTypes.shape({
        detail: PropTypes.string,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    ),
  }),
  onClick: PropTypes.func.isRequired,
  onUnlike: PropTypes.func,
};

export default AccommodationCard;
