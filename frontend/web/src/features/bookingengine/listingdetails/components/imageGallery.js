import React, { useState } from "react";

const ImageGallery = ({ images }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Prepare main + thumbnails
  const main = images[0];
  const thumbs = images.slice(1, 5); // max 4

  const toSrc = (key) => {
    if (!key) return "";
    if (typeof key === "string" &&
      (key.startsWith("http://") || key.startsWith("https://"))) {
      return key;
    }
    return `https://accommodation.s3.eu-north-1.amazonaws.com/${key}`;
  };

  const nextImage = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setActiveIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };

  return (
    <section className="image-section">

      {/* GALLERY */}
      <div className="image-gallery">

        {/* MAIN IMAGE */}
        {main && (
          <img
            className="main-image"
            src={toSrc(main.key)}
            onClick={() => { setActiveIndex(0); setShowOverlay(true); }}
          />
        )}

        {/* THUMBNAILS */}
        <div className="small-images-container">
          {thumbs.map((img, index) => (
            <img
              key={img.key}
              className="small-image"
              src={toSrc(img.key)}
              onClick={() => { setActiveIndex(index + 1); setShowOverlay(true); }}
            />
          ))}
        </div>

      </div>

      {/* FULLSCREEN OVERLAY */}
      {showOverlay && (
        <div className="image-overlay">

          <button className="close-overlay-button" onClick={() => setShowOverlay(false)}>
            ×
          </button>

          <div className="overlay-center-wrapper">

            <button className="nav-button left" onClick={prevImage}>
              ‹
            </button>

            <img
              className="overlay-main-image"
              src={toSrc(images[activeIndex].key)}
            />

            <button className="nav-button right" onClick={nextImage}>
              ›
            </button>

          </div>

          <div className="overlay-thumbnails">
            {images.map((img, index) => (
              <img
                key={img.key}
                className={`thumb ${index === activeIndex ? "active" : ""}`}
                src={toSrc(img.key)}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>

        </div>
      )}

    </section>
  );
};

export default ImageGallery;
