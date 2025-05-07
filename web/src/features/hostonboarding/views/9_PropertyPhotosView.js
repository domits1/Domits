// --- START OF FILE 9_PropertyPhotosView.js ---

import React, { useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ImagePreview from "../components/ImagePreview"; // Ensure correct path
import usePhotos, { MAX_IMAGES, MIN_IMAGES_REQUIRED, ALLOWED_FORMATS, MIN_WIDTH, MIN_HEIGHT } from "../hooks/usePropertyPhotos"; // Import constants
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss"; // Main import likely includes photosView.scss
// REMOVED: import { useBuilder } from '../../../context/propertyBuilderContext';
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"; // Import Zustand store hook

function PropertyPhotosView() {
  // REMOVED: const builder = useBuilder();
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  // --- Zustand Store ---
  // Get the action to update the 'images' object within accommodationDetails
  const updateAccommodationDetail = useFormStoreHostOnboarding(
    (state) => state.updateAccommodationDetail
  );
  // -------------------

  // --- Local Photo Management Hook ---
  const {
    images, // This holds the array of base64 strings from the hook's local state
    handleFileChange,
    deleteImage,
    reorderImages,
  } = usePhotos(); // Hook manages image data and core logic locally
  // ---------------------------------


  // --- Local UI State (Remains the same) ---
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isInitialDragOver, setIsInitialDragOver] = useState(false);
  const [isGridDragOver, setIsGridDragOver] = useState(false);
  const fileInputRef = useRef(null);
  // --------------------------------------

  // --- Reordering Handlers (Remain the same) ---
  const handleDragStartReorder = useCallback((index) => {
    setDraggedIndex(index);
    setDragOverIndex(null);
  }, []);

  const handleDragEnterReorder = useCallback((index) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragLeaveReorder = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDropReorder = useCallback((targetIndex) => {
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      reorderImages(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, reorderImages]);
  // ------------------------------------------

  // --- File Input Trigger (Remains the same) ---
  const triggerFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, []);

  const onFileSelected = useCallback((event) => {
    if (event.target.files && event.target.files.length > 0) {
      handleFileChange(event.target.files);
    }
  }, [handleFileChange]);
  // -------------------------------------------

  // --- File Upload Drag/Drop Handlers (Remain the same) ---
  const handleDropUpload = useCallback((event) => {
    event.preventDefault();
    setIsInitialDragOver(false);
    setIsGridDragOver(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      if (draggedIndex === null) {
        handleFileChange(event.dataTransfer.files);
      }
    } else {
      console.log("Dropped item was not a file.");
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [handleFileChange, draggedIndex]);

  const handleInitialDragOver = useCallback((event) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes('Files')) {
      setIsInitialDragOver(true);
    }
  }, []);

  const handleInitialDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsInitialDragOver(false);
    }
  }, []);

  const handleGridDragEnter = useCallback((event) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes('Files') && draggedIndex === null) {
      setIsGridDragOver(true);
    }
  }, [draggedIndex]);

  const handleGridDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleGridDragLeave = useCallback((event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsGridDragOver(false);
    }
  }, []);
  // -------------------------------------------------------

  // --- Derived State & Validation (Remain the same) ---
  const isProceedDisabled = useMemo(() => images.length < MIN_IMAGES_REQUIRED, [images.length]);
  const showAddMore = useMemo(() => images.length > 0 && images.length < MAX_IMAGES, [images.length]);
  // --------------------------------------------------

  // --- *** MODIFIED Proceed Logic *** ---
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) return;

    // 1. Transform the 'images' array (base64 strings from usePhotos hook)
    //    into the object format required by the Zustand store ({ image1: '...', image2: '...' }).
    const imagesObjectForStore = images.reduce((acc, base64String, index) => {
      acc[`image${index + 1}`] = base64String;
      return acc;
    }, {});

    // 2. Update the Zustand store using the existing updateAccommodationDetail action.
    updateAccommodationDetail('images', imagesObjectForStore);
    console.log("Updated Zustand store with images object:", imagesObjectForStore); // Log the saved object

    // REMOVED: builder.addImages(images);
    // REMOVED: console.log("Builder after adding images:", builder);

    // 3. Navigate to the next step.
    navigate(`/hostonboarding/${accommodationType}/pricing`);

  }, [
    navigate,
    accommodationType,
    images, // The array from usePhotos hook is the source
    isProceedDisabled,
    updateAccommodationDetail // Zustand action is now a dependency
    // REMOVED: builder
  ]);
  // --- ****************************** ---

  // --- JSX (largely remains the same, updates OnboardingButton onClick) ---
  return (
    <div className="onboarding-host-div">
      <main className="photo-gallery-container">
        <h2 className="onboardingSectionTitle">
          Property Photos ({images.length} / {MAX_IMAGES})
        </h2>
        <p className="onboardingSectionSubtitle">
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
          // Initial Empty State (unchanged)
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
            <span className="drag-drop-icon" aria-hidden="true">📤</span>
            <p>Drag & drop photos here</p>
            <p className="drag-drop-separator">or</p>
            <span className="upload-button-styled">Click to upload</span>
            <small className="drag-drop-info">Min {MIN_WIDTH}x{MIN_HEIGHT}px, Max {MAX_IMAGES} photos</small>
          </div>
        ) : (
          // Images Present State (unchanged)
          <section
            className={`photo-gallery-section ${isGridDragOver ? 'grid-drag-over-upload' : ''}`}
            onDragEnter={handleGridDragEnter}
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
                  isDragging={draggedIndex === index}
                  isDragOver={dragOverIndex === index}
                  onDelete={deleteImage}
                  onDragStart={handleDragStartReorder}
                  onDropReorder={handleDropReorder}
                  onDragEnterReorder={handleDragEnterReorder}
                  onDragLeaveReorder={handleDragLeaveReorder}
                />
              ))}

              {showAddMore && (
                <div
                  className="image-preview-wrapper add-more-box"
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

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/rules`}
            btnText="Go back"
            variant="secondary"
          />
          {/* *** MODIFIED OnboardingButton onClick *** */}
          <OnboardingButton
            onClick={handleProceed} // Use the refactored handleProceed
            btnText="Proceed"
            variant="primary"
            disabled={isProceedDisabled}
          />
          {/* ************************************** */}
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