import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { createPortal } from "react-dom";

const clampIndex = (value, maxLength) => {
  const normalizedLength = Math.max(0, Number(maxLength) || 0);
  if (normalizedLength < 1) {
    return 0;
  }

  const normalizedValue = Number.isInteger(value) ? value : 0;
  return Math.max(0, Math.min(normalizedValue, normalizedLength - 1));
};

const defaultResolveImageSrc = (image) => String(image || "").trim();
const defaultResolveThumbSrc = (image) => defaultResolveImageSrc(image);
const defaultResolveImageKey = (image, index) => defaultResolveImageSrc(image) || String(index);
const defaultResolveImageAlt = (index) => `Gallery image ${index + 1}`;

export default function PhotoBrowserOverlay({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  resolveImageSrc = defaultResolveImageSrc,
  resolveThumbSrc = defaultResolveThumbSrc,
  resolveImageKey = defaultResolveImageKey,
  resolveImageAlt = defaultResolveImageAlt,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedImages = Array.isArray(images) ? images : [];
  const canBrowse = normalizedImages.length > 1;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(clampIndex(initialIndex, normalizedImages.length));
  }, [initialIndex, isOpen, normalizedImages.length]);

  useEffect(() => {
    if (!isOpen || globalThis.document === undefined) {
      return undefined;
    }

    const originalOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!canBrowse) {
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((currentIndex) =>
          currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1
        );
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((currentIndex) => (currentIndex + 1) % normalizedImages.length);
      }
    };

    globalThis.document.addEventListener("keydown", handleKeyDown);

    return () => {
      globalThis.document.body.style.overflow = originalOverflow;
      globalThis.document.removeEventListener("keydown", handleKeyDown);
    };
  }, [canBrowse, isOpen, normalizedImages.length, onClose]);

  if (!isOpen || normalizedImages.length < 1 || globalThis.document === undefined) {
    return null;
  }

  const activeImage = normalizedImages[activeIndex];

  return createPortal(
    <div className="image-overlay">
      <button
        type="button"
        className="close-overlay-button"
        onClick={onClose}
        aria-label="Close image gallery"
      >
        ×
      </button>

      <div className="overlay-center-wrapper">
        <button
          type="button"
          className="nav-button left"
          onClick={() =>
            setActiveIndex((currentIndex) =>
              currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1
            )
          }
          disabled={!canBrowse}
          aria-label="Previous image"
        >
          ‹
        </button>

        <img
          className="overlay-main-image"
          src={resolveImageSrc(activeImage)}
          alt={resolveImageAlt(activeIndex, activeImage)}
        />

        <button
          type="button"
          className="nav-button right"
          onClick={() => setActiveIndex((currentIndex) => (currentIndex + 1) % normalizedImages.length)}
          disabled={!canBrowse}
          aria-label="Next image"
        >
          ›
        </button>
      </div>

      <div className="overlay-thumbnails">
        {normalizedImages.map((image, index) => (
          <button
            type="button"
            key={resolveImageKey(image, index)}
            className={`thumb-button ${index === activeIndex ? "active" : ""}`.trim()}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show image ${index + 1}`}
          >
            <img
              className={`thumb ${index === activeIndex ? "active" : ""}`.trim()}
              src={resolveThumbSrc(image)}
              alt={resolveImageAlt(index, image)}
            />
          </button>
        ))}
      </div>
    </div>,
    globalThis.document.body
  );
}

PhotoBrowserOverlay.propTypes = {
  images: PropTypes.array.isRequired,
  initialIndex: PropTypes.number,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  resolveImageSrc: PropTypes.func,
  resolveThumbSrc: PropTypes.func,
  resolveImageKey: PropTypes.func,
  resolveImageAlt: PropTypes.func,
};
