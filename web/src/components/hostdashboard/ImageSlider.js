import React, { useState, useEffect } from 'react';

/**
 * @param images = Array of images from a single Accommodation object
 * @returns {Element}
 * @constructor
 */
function ImageSlider({ images }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const imageKeys = Object.keys(images).filter(key => key.startsWith('image'));
        const totalImages = imageKeys.length;

        // Start with the first image visible
        setIsVisible(true);

        // Set an interval to change the image every 5 seconds
        const intervalId = setInterval(() => {
            // Fade out the image first
            setIsVisible(false);

            // Change the image after a fade out (1s defined in CSS)
            setTimeout(() => {
                setCurrentImageIndex(prevIndex => (prevIndex + 1) % totalImages);
                setIsVisible(true); // Fade in the new image
            }, 1000); // Matches the transition duration
        }, 5000); // Image remains visible for 4s, fades out over 1s

        // Cleanup the interval and timeout on component unmount
        return () => {
            clearInterval(intervalId);
        };
    }, [images]);

    const imageSrc = images[`image${currentImageIndex + 1}`]; // image1, image2, etc.

    return (
        <img
            src={imageSrc}
            alt="Slideshow"
            className={`accommodation-img ${isVisible ? 'visible' : ''}`}
        />
    );
}

export default ImageSlider;
