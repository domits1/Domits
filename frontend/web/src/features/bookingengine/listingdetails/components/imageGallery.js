import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import IosShareIcon from "@mui/icons-material/IosShare";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import {
  resolveAccommodationImageUrl,
  resolveAccommodationImageKey,
} from "../../../../utils/accommodationImage";
import ShareModal from "../../components/ShareModal";
import WishlistChoice from "../../../guestdashboard/components/WishlistChoice";
import Toast from "../../../../components/toast/Toast";
import { getAccessToken } from "../../../guestdashboard/utils/authUtils";
import {
  updateWishlistItem,
  isPropertyInAnyWishlist,
} from "../../../guestdashboard/services/wishlistService";

const ImageGallery = ({ images, propertyTitle, propertyId }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likedWishlistName, setLikedWishlistName] = useState(null);
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [toast, setToast] = useState({ message: "", status: "" });

  const main = images[0];
  const thumbs = images.slice(1, 5);

  const toMainSrc = (image) => resolveAccommodationImageUrl(image, "web");
  const toThumbSrc = (image) => resolveAccommodationImageUrl(image, "thumb");
  const getImageAltText = (index) => `Accommodation image ${index + 1}`;

  const openOverlayAtIndex = (index) => {
    setActiveIndex(index);
    setShowOverlay(true);
  };

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  useEffect(() => {
    const checkIfLiked = async () => {
      const token = getAccessToken();
      if (!token || !propertyId) {
        setLiked(false);
        setLikedWishlistName(null);
        return;
      }

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
  }, [propertyId]);

  const handleLike = async () => {
    const token = getAccessToken();
    if (!token || !propertyId) {
      return;
    }

    const method = liked ? "DELETE" : "POST";

    try {
      await updateWishlistItem(propertyId, method, likedWishlistName ?? undefined);
      setLiked((prev) => !prev);

      if (method === "POST") {
        setShowWishlistModal(true);
        setToast({ message: "Added to wishlist", status: "success" });
      } else {
        setLikedWishlistName(null);
        setToast({ message: "Removed from wishlist", status: "info" });
      }
    } catch {
      setToast({ message: "Failed to update wishlist. Please try again.", status: "error" });
    }
  };

  return (
    <section className="image-section">
      <div className="image-gallery">
        {main && (
          <div className="main-image-wrapper">
            <button
              type="button"
              className="image-button main-image-button"
              onClick={() => openOverlayAtIndex(0)}
              aria-label="Open image 1"
            >
              <img
                className="main-image"
                src={toMainSrc(main)}
                alt={getImageAltText(0)}
              />
            </button>

            <button
              type="button"
              className="gallery-share-btn"
              onClick={() => setShowShareModal(true)}
              aria-label="Share property"
            >
              <IosShareIcon fontSize="small" />
            </button>

            <button
              type="button"
              className={`gallery-like-btn${liked ? " is-active" : ""}`}
              onClick={handleLike}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
            >
              {liked ? (
                <FavoriteIcon fontSize="small" />
              ) : (
                <FavoriteBorderOutlinedIcon fontSize="small" />
              )}
            </button>
          </div>
        )}

        <div className="small-images-container">
          {thumbs.map((img, index) => (
            <button
              type="button"
              key={resolveAccommodationImageKey(img, "web") || index}
              className="image-button small-image-button"
              onClick={() => openOverlayAtIndex(index + 1)}
              aria-label={`Open image ${index + 2}`}
            >
              <img
                className="small-image"
                src={toMainSrc(img)}
                alt={getImageAltText(index + 1)}
              />
            </button>
          ))}
        </div>
      </div>

      {showOverlay && (
        <div className="image-overlay">
          <button
            type="button"
            className="close-overlay-button"
            onClick={() => setShowOverlay(false)}
            aria-label="Close image gallery"
          >
            ×
          </button>

          <div className="overlay-center-wrapper">
            <button
              type="button"
              className="nav-button left"
              onClick={prevImage}
              aria-label="Previous image"
            >
              ‹
            </button>

            <img
              className="overlay-main-image"
              src={toMainSrc(images[activeIndex])}
              alt={getImageAltText(activeIndex)}
            />

            <button
              type="button"
              className="nav-button right"
              onClick={nextImage}
              aria-label="Next image"
            >
              ›
            </button>
          </div>

          <div className="overlay-thumbnails">
            {images.map((img, index) => (
              <button
                type="button"
                key={resolveAccommodationImageKey(img, "web") || index}
                className={`thumb-button ${index === activeIndex ? "active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show image ${index + 1}`}
              >
                <img
                  className={`thumb ${index === activeIndex ? "active" : ""}`}
                  src={toThumbSrc(img)}
                  alt={getImageAltText(index)}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {showShareModal && (
        <ShareModal
          url={globalThis.location.href}
          title={propertyTitle}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showWishlistModal && propertyId ? (
        <WishlistChoice
          propertyId={propertyId}
          activeList={likedWishlistName || "My next trip"}
          show={showWishlistModal}
          onClose={() => setShowWishlistModal(false)}
          onSave={(listName) => setLikedWishlistName(listName)}
        />
      ) : null}

      <Toast
        message={toast.message}
        status={toast.status || "info"}
        onClose={() => setToast({ message: "", status: "" })}
      />
    </section>
  );
};

ImageGallery.propTypes = {
  images: PropTypes.array.isRequired,
  propertyTitle: PropTypes.string,
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default ImageGallery;
