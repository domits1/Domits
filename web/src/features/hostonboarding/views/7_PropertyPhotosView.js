import React, { useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos, { MAX_IMAGES } from "../hooks/usePropertyPhotos";
import Button from "../components/OnboardingButton";
import "../styles/PropertyPhotosView.css";

const MIN_IMAGES_REQUIRED = 5;
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const MIN_WIDTH = 500;
const MIN_HEIGHT = 500;

function PropertyPhotosView() {
  const { type: accommodationType } = useParams();
  const {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
    isInitialDragOver,
    setIsInitialDragOver,
  } = usePhotos();

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [isGridDragOver, setIsGridDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragStart = useCallback((index) => {
    setDraggedIndex(index);
  }, []);

  const handleDropReorder = useCallback((targetIndex) => {
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderImages(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  }, [draggedIndex, reorderImages]);

  const triggerFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const onFileSelected = useCallback((event) => {
    if (event.target.files) {
      handleFileChange(event.target.files);
    }
  }, [handleFileChange]);

  const handleDropUpload = useCallback((event) => {
    event.preventDefault();
    setIsInitialDragOver(false);
    setIsGridDragOver(false);
    if (event.dataTransfer.files) {
      if (images.length < MAX_IMAGES) {
        handleFileChange(event.dataTransfer.files);
      } else {
        console.warn(`Maximum images (${MAX_IMAGES}) reached. Drop ignored.`);
      }
    }
  }, [handleFileChange, images.length, setIsInitialDragOver, setIsGridDragOver]); // Added dependencies

  const handleGridDragOver = useCallback((event) => {
    event.preventDefault();
    if (draggedIndex === null && images.length < MAX_IMAGES) {
      setIsGridDragOver(true);
    }
  }, [draggedIndex, images.length]);

  const handleGridDragLeave = useCallback(() => {
    setIsGridDragOver(false);
  }, []);

  const handleInitialDragOver = useCallback((event) => {
    event.preventDefault();
    setIsInitialDragOver(true);
  }, [setIsInitialDragOver]); // Added dependency

  const handleInitialDragLeave = useCallback(() => {
    setIsInitialDragOver(false);
  }, [setIsInitialDragOver]); // Added dependency

  const isProceedDisabled = images.length < MIN_IMAGES_REQUIRED;
  const showAddMore = images.length > 0 && images.length < MAX_IMAGES;

  return (
      <div className="onboarding-host-div">
        <main className="photo-gallery-container page-body">
          <h2 className="photo-gallery-title">
            Property Photos ({images.length} / {MAX_IMAGES})
          </h2>
          <p className="photo-gallery-subtitle">
            Add at least {MIN_IMAGES_REQUIRED} photos. The first photo will be the cover image. Drag to reorder.
          </p>

          <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={onFileSelected}
              accept={ALLOWED_FORMATS.join(",")}
              style={{ display: "none" }}
          />

          {images.length === 0 && (
              <div
                  className={`drag-drop-area ${isInitialDragOver ? "drag-over" : ""}`}
                  onClick={triggerFileInput}
                  onDragOver={handleInitialDragOver}
                  onDragLeave={handleInitialDragLeave}
                  onDrop={handleDropUpload}
              >
                <p>Drag & drop photos here</p>
                <p>or</p>
                <button type="button" className="upload-button-styled">Click to upload</button>
                <small>Min {MIN_WIDTH}x{MIN_HEIGHT}px, Max {MAX_IMAGES} photos</small>
              </div>
          )}

          {images.length > 0 && (
              <section
                  className={`photo-gallery-section ${isGridDragOver ? 'grid-drag-over' : ''}`}
                  onDragOver={handleGridDragOver}
                  onDragLeave={handleGridDragLeave}
                  onDrop={handleDropUpload}
              >
                <div className="photo-gallery-images">
                  {images.map((image, index) => (
                      <ImagePreview
                          key={image.substring(image.length - 20) + index}
                          image={image}
                          index={index}
                          onDelete={deleteImage}
                          onDragStart={handleDragStart}
                          onDrop={handleDropReorder}
                          isDragging={draggedIndex === index}
                      />
                  ))}

                  {showAddMore && (
                      <div
                          className="small-photo add-more-box"
                          onClick={triggerFileInput}
                          role="button"
                          tabIndex={0}
                          onKeyPress={(e) => e.key === 'Enter' && triggerFileInput()}
                      >
                        <span className="add-more-icon">+</span>
                        <p>Add More</p>
                      </div>
                  )}
                </div>
              </section>
          )}

          <nav className="photo-gallery-navigation onboarding-button-box">
            <Button
                routePath={`/hostonboarding/${accommodationType}/rules`}
                btnText="Go back"
                variant="secondary"
            />
            <Button
                routePath={`/hostonboarding/${accommodationType}/pricing`}
                btnText="Proceed"
                disabled={isProceedDisabled}
            />
          </nav>
          {isProceedDisabled && images.length > 0 && (
              <p className="error-message">
                Please add at least {MIN_IMAGES_REQUIRED} photos to proceed.
              </p>
          )}
        </main>
      </div>
  );
}

export default PropertyPhotosView;