import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import IosShareIcon from "@mui/icons-material/IosShare";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import {
  resolveAccommodationImageUrl,
  resolveAccommodationImageKey,
} from "../../../../utils/accommodationImage";
import PhotoBrowserOverlay from "../../../../components/gallery/PhotoBrowserOverlay";
import ShareModal from "../../components/ShareModal";
import WishlistChoice from "../../../guestdashboard/components/WishlistChoice";
import Toast from "../../../../components/toast/Toast";
import { getAccessToken } from "../../../guestdashboard/utils/authUtils";
import {
  updateWishlistItem,
  isPropertyInAnyWishlist,
} from "../../../guestdashboard/services/wishlistService";
import SkeletonBlock from "./SkeletonBlock";

const ImageGallery = ({ images = [], propertyTitle, propertyId, isLoading = false }) => {
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
        {isLoading && !main ? (
          <div className="main-image-wrapper" aria-busy="true">
            <SkeletonBlock className="main-image" width="100%" height="100%" borderRadius={12} />
          </div>
        ) : null}

        {main ? (
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
                fetchPriority="high"
                decoding="async"
                loading="eager"
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
        ) : null}

        {images.length > 0 ? (
          <button
            type="button"
            className="view-all-photos-btn"
            onClick={() => openOverlayAtIndex(0)}
            aria-label="View all photos"
          >
            <PhotoLibraryIcon fontSize="small" />
            View all photos
          </button>
        ) : null}

        <div className="small-images-container">
          {isLoading && thumbs.length === 0
            ? Array.from({ length: 4 }, (_, index) => (
                <div key={`gallery-thumb-skeleton-${index}`} className="image-button small-image-button" aria-busy="true">
                  <SkeletonBlock className="small-image" width="100%" height="100%" borderRadius={10} />
                </div>
              ))
            : null}

          {thumbs.map((image, index) => (
            <button
              type="button"
              key={resolveAccommodationImageKey(image, "web") || index}
              className="image-button small-image-button"
              onClick={() => openOverlayAtIndex(index + 1)}
              aria-label={`Open image ${index + 2}`}
            >
              <img
                className="small-image"
                src={toThumbSrc(image)}
                alt={getImageAltText(index + 1)}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      </div>

      <PhotoBrowserOverlay
        images={images}
        initialIndex={activeIndex}
        isOpen={showOverlay}
        onClose={() => setShowOverlay(false)}
        showSideZones={true}
        resolveImageSrc={toMainSrc}
        resolveThumbSrc={toThumbSrc}
        resolveImageKey={(image, index) => resolveAccommodationImageKey(image, "web") || index}
        resolveImageAlt={(index) => getImageAltText(index)}
      />

      {showShareModal ? (
        <ShareModal
          url={globalThis.location.href}
          title={propertyTitle}
          onClose={() => setShowShareModal(false)}
        />
      ) : null}

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
  images: PropTypes.array,
  propertyTitle: PropTypes.string,
  propertyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isLoading: PropTypes.bool,
};

export default ImageGallery;
