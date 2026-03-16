import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const currentImageIndexRef = useRef(0);

  useEffect(() => {
    currentImageIndexRef.current = currentImageIndex;
  }, [currentImageIndex]);

  const showNextImage = useCallback(() => {
    if (!safeImages.length) {
      return;
    }

    const nextIndex = (currentImageIndexRef.current + 1) % safeImages.length;
    currentImageIndexRef.current = nextIndex;
    setCurrentImageIndex(nextIndex);
    setIsVisible(true);
  }, [safeImages.length]);

  useEffect(() => {
    if (!safeImages.length) return undefined;

    setIsVisible(true);
    let timeoutId;

    const intervalId = setInterval(() => {
      setIsVisible(false);

      timeoutId = setTimeout(showNextImage, 1000);
    }, ms);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [safeImages.length, ms, showNextImage]);

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
