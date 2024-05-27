import React, { useState } from 'react';
import './imagegallery.css'; // Zorg ervoor dat je deze CSS-bestand hebt

const ImageGallery = ({ images }) => {
  const [selectedImg, setSelectedImg] = useState(images[0]);

  return (
    <div className="image-gallery-container">
      <div className="selected-image">
        <img className="selected-thumbnail" src={selectedImg} alt="Selected" />
      </div>
      <div className="image-thumbnails">
        {images.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`Thumbnail ${index}`}
            onClick={() => setSelectedImg(img)}
            className={img === selectedImg ? 'active' : ''}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageGallery;
