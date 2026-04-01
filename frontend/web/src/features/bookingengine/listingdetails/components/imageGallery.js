import React, { useState } from "react";
import PropTypes from "prop-types";
import IosShareIcon from "@mui/icons-material/IosShare";
import {
  resolveAccommodationImageUrl,
  resolveAccommodationImageKey,
} from "../../../../utils/accommodationImage";
import ShareModal from "../../components/ShareModal";

const ImageGallery = ({ images, propertyTitle }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);

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
    </section>
  );
};

ImageGallery.propTypes = {
  images: PropTypes.array.isRequired,
  propertyTitle: PropTypes.string,
};

export default ImageGallery;
