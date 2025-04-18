import React from "react";
import Rating from "./rating";

const ImageGallery = ({ images }) => {
  return (
    <section className="image-section">
      <div className="image-gallery">
        <img
          className="main-image"
          src={`https://accommodation.s3.eu-north-1.amazonaws.com/${images[0].key}`}
          alt="Main"
        />
        <div className="small-images-container">
          {images.map((image) => {
            if (image !== images[0]) {
              return (
                <img
                  key={image.key}
                  className="small-image"
                  src={`https://accommodation.s3.eu-north-1.amazonaws.com/${image.key}`}
                  alt={`Extra ${images.indexOf(image)}`}
                />
              );
            }
          })}
        </div>
      </div>
      <Rating />
      <div className="host-name">Hosted by Huub Homer</div>
    </section>
  );
};

export default ImageGallery;
