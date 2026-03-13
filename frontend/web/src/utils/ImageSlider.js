import React, { useState, useEffect } from 'react';
import styles from "../features/hostdashboard/HostDashboard.module.scss";
import { placeholderImage, resolveAccommodationImageUrl } from "./accommodationImage";

/**
 * @param images = images you want to slide through
 * @param seconds = interval for switching images
 * @returns {Element}
 * @constructor
 */
function ImageSlider({ images, seconds, page }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const safeImages = Array.isArray(images) ? images : [];
  const ms = seconds * 1000;

  useEffect(() => {
    if (!safeImages.length) return undefined;

    setIsVisible(true);

    const intervalId = setInterval(() => {
      setIsVisible(false);

      setTimeout(() => {
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % safeImages.length);
        setIsVisible(true);
      }, 1000);
    }, ms);

    return () => {
      clearInterval(intervalId);
    };
  }, [safeImages, ms]);

  const imageSrc = resolveAccommodationImageUrl(safeImages[currentImageIndex], "web") || placeholderImage;

  return (
    <img
      src={imageSrc}
      alt="Slideshow"
      className={`${page === 'dashboard' ? styles.accommodationImg : styles.imgSliderImage} ${isVisible ? styles.visible : ''}`}
    />
  );
}

export default ImageSlider;
