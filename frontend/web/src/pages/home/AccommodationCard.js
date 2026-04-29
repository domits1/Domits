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

const AccommodationCard = ({
  accommodation = null,
  onClick,
  onUnlike,
  imageVariant = "thumb",
}) => {
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
    imageVariant,
  );

  const { nightlyDisplayPrice } = getListingPricingBreakdown(
    accommodation.propertyPricing,
    1,
  );

return (
  <div className="accocard-wrapper">
    <div className="accocard">

      <a
        className="accocard-content"
        href={`/listingdetails?ID=${encodeURIComponent(propertyId)}`}
        onClick={(e) => {
          e.preventDefault();
          handleCardClick(e, propertyId);
        }}
      >

        <div className="card-img">
          <img src={cardImages[0]} alt={propertyTitle} />

          <div className="rating">
            ⭐ <span>{accommodation.property?.rating || 4.8}</span>
          </div>
        </div>

        <div className="card-body">
          <h3>{propertyTitle}</h3>

          <p className="location">
            {accommodation.property?.city || accommodation.property?.location || "Unknown location"}
          </p>

          <div className="info">
            <span>
              <BedOutlinedIcon />
              {accommodation.propertyGeneralDetails?.find(
                (i) => i.detail === "Bedrooms"
              )?.value || 0} beds
            </span>

            <span>
              <PeopleOutlinedIcon />
              {accommodation.propertyGeneralDetails?.find(
                (i) => i.detail === "Guests"
              )?.value || 0} guests
            </span>
          </div>

          <div className="divider" />

          <div className="price">
            {formatEuroAmount(nightlyDisplayPrice)}
            <span> / night</span>
          </div>
        </div>

      </a>
    </div>

    <button
      type="button"
      className="accocard-share-button"
      onClick={handleShare}
    >
      <IosShareIcon />
    </button>

    <button
      type="button"
      className="accocard-like-button"
      onClick={handleLike}
    >
      {liked ? (
        <FavoriteIcon sx={{ color: "#ec5050" }} />
      ) : (
        <FavoriteBorderOutlinedIcon />
      )}
    </button>

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
        title={propertyTitle}
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
        document.body
      )}
  </div>
);
}

export default AccommodationCard;
