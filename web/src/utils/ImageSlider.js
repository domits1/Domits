import React, { useState, useEffect } from 'react';
import styles from "../features/hostdashboard/HostDashboard.module.css";

/**
 * @param images = images you want to slide through
 * @param seconds = interval for switching images
 * @returns {Element}
 * @constructor
 */
function ImageSlider({ images, seconds, page}) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ms = seconds * 1000;

    useEffect(() => {
        const imageKeys = Object.keys(images).filter(key => key === "key");
        const totalImages = imageKeys.length;

        setIsVisible(true);

        const intervalId = setInterval(() => {
            setIsVisible(false);

            setTimeout(() => {
                setCurrentImageIndex(prevIndex => (prevIndex + 1) % totalImages);
                setIsVisible(true);
            }, 1000);
        }, ms);

        return () => {
            clearInterval(intervalId);
        };
    }, [images, seconds]);

    const imageSrc = images[currentImageIndex].key;

    return (
        <img
            src={`https://accommodation.s3.eu-north-1.amazonaws.com/${imageSrc}`}
            alt="Slideshow"
            className={`${(page === 'dashboard') ? styles.accommodationImg : styles.imgSliderImage} ${isVisible ? styles.visible : ''}`}
        />
    );
}

export default ImageSlider;
