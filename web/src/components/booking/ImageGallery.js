import React, { useState } from 'react';
import './imagegallery.css'; // Zorg ervoor dat je deze CSS-bestand hebt

const ImageGallery = ({ images }) => {
    // Zorg ervoor dat slechts de eerste vijf afbeeldingen worden weergegeven
    const limitedImages = images.slice(0, 5);
    const [selectedImg, setSelectedImg] = useState(limitedImages[0]);

    return (
        <div className="image-gallery-container">
            <div className="selected-image">
                <img className="selected-thumbnail" src={selectedImg} alt="Selected" />
            </div>
            <div className="image-thumbnails">
                {limitedImages.map((img, index) => (
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
