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
  showSideZones = false,
  alwaysShowSideZoneArrows = false,
  resolveImageSrc = defaultResolveImageSrc,
  resolveThumbSrc = defaultResolveThumbSrc,
  resolveImageKey = defaultResolveImageKey,
  resolveImageAlt = defaultResolveImageAlt,
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedImages = Array.isArray(images) ? images : [];
  const runtimeDocument = globalThis.document;
  const canBrowse = normalizedImages.length > 1;
  const goToPreviousImage = () => {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? normalizedImages.length - 1 : currentIndex - 1
    );
  };
  const goToNextImage = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % normalizedImages.length);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveIndex(clampIndex(initialIndex, normalizedImages.length));
  }, [initialIndex, isOpen, normalizedImages.length]);

  useEffect(() => {
    if (!isOpen || !runtimeDocument) {
      return undefined;
    }

    const originalOverflow = runtimeDocument.body.style.overflow;
    runtimeDocument.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!canBrowse) {
        return;
      }

      if (event.key === "ArrowLeft") {
        goToPreviousImage();
      }

      if (event.key === "ArrowRight") {
        goToNextImage();
      }
    };

    runtimeDocument.addEventListener("keydown", handleKeyDown);

    return () => {
      runtimeDocument.body.style.overflow = originalOverflow;
      runtimeDocument.removeEventListener("keydown", handleKeyDown);
    };
  }, [canBrowse, isOpen, normalizedImages.length, onClose, runtimeDocument]);

  if (!isOpen || normalizedImages.length < 1 || !runtimeDocument) {
    return null;
  }

  const activeImage = normalizedImages[activeIndex];
  const overlayClassName = `image-overlay${showSideZones ? " with-side-zones" : ""}${
    alwaysShowSideZoneArrows ? " show-side-zone-arrows" : ""
  }`;

  return createPortal(
    <div className={overlayClassName}>
      <button
        type="button"
        className="close-overlay-button"
        onClick={onClose}
        aria-label="Close image gallery"
      >
        ×
      </button>

      {showSideZones ? (
        <>
          <button
            type="button"
            className="nav-side-zone left"
            onClick={goToPreviousImage}
            disabled={!canBrowse}
            aria-label="Previous image"
          />
          <button
            type="button"
            className="nav-side-zone right"
            onClick={goToNextImage}
            disabled={!canBrowse}
            aria-label="Next image"
          />
        </>
      ) : null}

      <div className="overlay-center-wrapper">
        <button
          type="button"
          className="nav-button left"
          onClick={goToPreviousImage}
          disabled={!canBrowse}
          aria-label="Previous image"
        >
          ‹
        </button>

        <img
          className="overlay-main-image"
          src={resolveImageSrc(activeImage)}
          alt={resolveImageAlt(activeIndex, activeImage)}
          decoding="async"
        />

        <button
          type="button"
          className="nav-button right"
          onClick={goToNextImage}
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
              loading="lazy"
              decoding="async"
              width={150}
              height={100}
            />
          </button>
        ))}
      </div>
    </div>,
    runtimeDocument.body
  );
}

PhotoBrowserOverlay.propTypes = {
  images: PropTypes.array.isRequired,
  initialIndex: PropTypes.number,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  showSideZones: PropTypes.bool,
  alwaysShowSideZoneArrows: PropTypes.bool,
  resolveImageSrc: PropTypes.func,
  resolveThumbSrc: PropTypes.func,
  resolveImageKey: PropTypes.func,
  resolveImageAlt: PropTypes.func,
};
