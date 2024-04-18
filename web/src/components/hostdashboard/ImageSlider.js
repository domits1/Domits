import React, { useState, useEffect } from 'react';

/**
 * @param images
 * @returns {Element}
 * @constructor
 */
function ImageSlider({ images }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const imageKeys = Object.keys(images).filter(key => key.startsWith('image'));
        const totalImages = imageKeys.length;

        setIsVisible(true);

        const intervalId = setInterval(() => {
            setIsVisible(false);

            setTimeout(() => {
                setCurrentImageIndex(prevIndex => (prevIndex + 1) % totalImages);
                setIsVisible(true);
            }, 1000);
        }, 5000);

        return () => {
            clearInterval(intervalId);
        };
    }, [images]);

    const imageSrc = images[`image${currentImageIndex + 1}`];

    return (
        <img
            src={imageSrc}
            alt="Slideshow"
            className={`accommodation-img ${isVisible ? 'visible' : ''}`}
        />
    );
}

export default ImageSlider;
