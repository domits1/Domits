import React from "react";

const ImageGallery = ({property}) => {
  return (
    <div className="image-gallery">
      <img
        className="main-image"
        src={`https://accommodation.s3.eu-north-1.amazonaws.com/${property.images[0].key}`}
        alt="Main"
      />
      <div className="small-images-container">
        {property.images.map((image) => {
          if (image !== property.images[0]) {
            return (
              <img
                className="small-image"
                src={`https://accommodation.s3.eu-north-1.amazonaws.com/${image.key}`}
                alt={`Extra ${property.images.indexOf(image)}`}
              />
            );
          }
        })}
      </div>
    </div>
  );
};

export default ImageGallery;