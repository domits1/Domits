import React, { useState } from "react";
import Rating from "./rating";

const ImageGallery = ({ images }) => {
  const [showOverlay, setShowOverlay] = useState(false);

  const handleMainImageClick = () => {
    setShowOverlay(true); // Show the overlay
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false); // Hide the overlay
  };

  const toSrc = (key) => {
    if (!key) return '';
    if (typeof key === 'string' && (key.startsWith('http://') || key.startsWith('https://'))) {
      return key;
    }
    return `https://accommodation.s3.eu-north-1.amazonaws.com/${key}`;
  };

  return (
    <section className="image-section">
      <div className="image-gallery">
        <img
          className="main-image"
          src={toSrc(images[0].key)}
          alt="Main"
          onClick={handleMainImageClick} // Show overlay on click
        />
        <div className="small-images-container">
          {images.map((image) => {
            if (image !== images[0]) {
              return (
                <img
                  key={image.key}
                  className="small-image"
                  src={toSrc(image.key)}
                  alt={`Extra ${images.indexOf(image)}`}
                />
              );
            }
          })}
        </div>
      </div>
      <Rating />
      <div className="host-name">Hosted by Huub Homer</div>

      {/* Overlay */}
      {showOverlay && (
        <div className="image-overlay">
          <button className="close-overlay-button" onClick={handleCloseOverlay}>
            Close
          </button>
          <div className="overlay-images">
            {images.map((image, index) => (
              <img
                key={image.key}
                className="overlay-thumbnail"
                src={toSrc(image.key)}
                alt={`Overlay ${index}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ImageGallery;