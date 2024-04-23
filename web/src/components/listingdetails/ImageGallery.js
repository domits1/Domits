import React, { useState } from 'react';
import './imagegallery.css'; // You need to create this CSS file for styling

const ImageGallery = ({ images }) => {
  const [selectedImg, setSelectedImg] = useState(images[0]);

  return (
    <div className="image-gallery-container">
      <div className="selected-image">
        <img src={selectedImg} alt="Selected" />
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