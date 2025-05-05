// --- START OF FILE 9_PropertyPhotosView.js ---

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ImagePreview from "../components/ImagePreview"; // Ensure correct path
import usePhotos, { MAX_IMAGES, MIN_IMAGES_REQUIRED, ALLOWED_FORMATS, MIN_WIDTH, MIN_HEIGHT } from "../hooks/usePropertyPhotos"; // Import constants
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss"; // Main import likely includes photosView.scss
import { useBuilder } from '../../../context/propertyBuilderContext';

function PropertyPhotosView() {
  const builder = useBuilder();
  const navigate = useNavigate();

  const { type: accommodationType } = useParams();
  const {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
  } = usePhotos(); // Hook manages image data and core logic



  // --- Local UI State ---
  const [draggedIndex, setDraggedIndex] = useState(null);         // Index of image being dragged for reorder
  const [dragOverIndex, setDragOverIndex] = useState(null);       // Index of image being hovered over during reorder
  const [isInitialDragOver, setIsInitialDragOver] = useState(false); // Dragging file over initial empty area
  const [isGridDragOver, setIsGridDragOver] = useState(false);     // Dragging file over the image grid area

  const fileInputRef = useRef(null);

  // --- Reordering Handlers ---
  const handleDragStartReorder = useCallback((index) => {
    setDraggedIndex(index);
    setDragOverIndex(null); // Clear hover state when starting drag
  }, []);

  const handleDragEnterReorder = useCallback((index) => {
    // Only set hover state if dragging *another* image over this one
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeaveReorder = useCallback(() => {
    setDragOverIndex(null); // Clear hover state when leaving item
  }, []);

  const handleDropReorder = useCallback((targetIndex) => {
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderImages(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null); // Clear states on drop
  }, [draggedIndex, reorderImages]);

  // --- File Input Trigger ---
  const triggerFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Clear previous selection for onChange to fire
      fileInputRef.current.click();
    }
  }, []);

  const onFileSelected = useCallback((event) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileChange(event.target.files);
    }
  }, [handleFileChange]);

  // --- File Upload Drag/Drop Handlers ---
  const handleDropUpload = useCallback((event) => {
    event.preventDefault();
    setIsInitialDragOver(false);
    setIsGridDragOver(false);

    // Check if files are being dropped
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      // Only handle if NOT currently reordering an image
      if (draggedIndex === null) {
        handleFileChange(event.dataTransfer.files);
      }
    } else {
      // If not dropping files, it might be an internal reorder drop that missed target
      // Or some other drag type - reset states just in case
      console.log("Dropped item was not a file.");
    }
    // Reset reorder drag state in case a reorder drag was aborted by dropping here
    setDraggedIndex(null);
    setDragOverIndex(null);

  }, [handleFileChange, draggedIndex]); // Added draggedIndex dependency

  const handleInitialDragOver = useCallback((event) => {
    event.preventDefault(); // Allow drop
    // Check if the dragged item contains files
    if (event.dataTransfer.types.includes('Files')) {
      setIsInitialDragOver(true);
    }
  }, []);

  const handleInitialDragLeave = useCallback((event) => {
    // Check if relatedTarget indicates leaving the window/area entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsInitialDragOver(false);
    }
  }, []);

  const handleGridDragEnter = useCallback((event) => {
    event.preventDefault();
    // Check if files are being dragged over the grid and we're not reordering
    if (event.dataTransfer.types.includes('Files') && draggedIndex === null) {
      setIsGridDragOver(true);
    }
  }, [draggedIndex]);

  const handleGridDragOver = useCallback((event) => {
    event.preventDefault(); // Keep allowing drop while over grid
    // Optional: Could add throttling here if performance is an issue
  }, []);

  const handleGridDragLeave = useCallback((event) => {
    // Check if relatedTarget indicates leaving the grid area entirely
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsGridDragOver(false);
    }
  }, []);

  // --- Derived State & Validation ---
  const isProceedDisabled = useMemo(() => images.length < MIN_IMAGES_REQUIRED, [images.length]);
  const showAddMore = useMemo(() => images.length > 0 && images.length < MAX_IMAGES, [images.length]);

  // --- JSX ---
  return (
    <div className="onboarding-host-div">
      <main className="photo-gallery-container"> {/* Use class for specific view styling */}
        <h2 className="onboardingSectionTitle"> {/* Use generic class */}
          Property Photos ({images.length} / {MAX_IMAGES})
        </h2>
        <p className="onboardingSectionSubtitle"> {/* Use generic class */}
          Add at least {MIN_IMAGES_REQUIRED} photos. The first photo is the cover. Drag to reorder.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileSelected}
          accept={ALLOWED_FORMATS.join(",")}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {images.length === 0 ? (
          // Initial Empty State
          <div
            className={`drag-drop-area ${isInitialDragOver ? "drag-over" : ""}`}
            onClick={triggerFileInput}
            onDragOver={handleInitialDragOver}
            onDragLeave={handleInitialDragLeave}
            onDrop={handleDropUpload}
            role="button"
            tabIndex={0}
            aria-label="Upload photos area"
            onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}
          >
            <span className="drag-drop-icon" aria-hidden="true">📤</span> {/* Replace with better icon */}
            <p>Drag & drop photos here</p>
            <p className="drag-drop-separator">or</p>
            {/* Button is visually styled, but click handled by parent div */}
            <span className="upload-button-styled">Click to upload</span>
            <small className="drag-drop-info">Min {MIN_WIDTH}x{MIN_HEIGHT}px, Max {MAX_IMAGES} photos</small>
          </div>
        ) : (
          // Images Present State
          <section
            className={`photo-gallery-section ${isGridDragOver ? 'grid-drag-over-upload' : ''}`}
            onDragEnter={handleGridDragEnter} // Detect file drag entering grid
            onDragOver={handleGridDragOver}  // Detect file drag over grid
            onDragLeave={handleGridDragLeave} // Detect file drag leaving grid
            onDrop={handleDropUpload}      // Handle file drop ON THE GRID background
          >
            <div className="photo-gallery-images"> {/* Grid container */}
              {images.map((image, index) => (
                <ImagePreview
                  key={image.substring(image.length - 20) + index} // Simple key strategy
                  image={image}
                  index={index}
                  isDragging={draggedIndex === index}
                  isDragOver={dragOverIndex === index} // Is another item being dragged over this one?
                  onDelete={deleteImage}
                  onDragStart={handleDragStartReorder}
                  onDropReorder={handleDropReorder} // Handle drop for reordering *onto* an item
                  onDragEnterReorder={handleDragEnterReorder} // Handle hover *over* an item during reorder
                  onDragLeaveReorder={handleDragLeaveReorder} // Handle leaving hover *over* an item
                />
              ))}

              {showAddMore && (
                <div
                  className="image-preview-wrapper add-more-box" // Use wrapper class + specific class
                  onClick={triggerFileInput}
                  role="button"
                  tabIndex={0}
                  aria-label="Add more photos"
                  onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}
                >
                  <span className="add-more-icon" aria-hidden="true">+</span>
                  <p>Add More</p>
                </div>
              )}
            </div>
          </section>
        )}

        <nav className="onboarding-button-box"> {/* Generic button container class */}
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/rules`} // Adjust path if needed
            btnText="Go back"
            variant="secondary"
          />
          <OnboardingButton
            onClick={() => {

              builder.addImages(images);
              console.log("Builder after adding images:", builder);
              navigate(`/hostonboarding/${accommodationType}/pricing`);
            }}
            btnText="Proceed"
            variant="primary"
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
// --- END OF FILE 9_PropertyPhotosView.js ---