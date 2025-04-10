import React, { useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos, { MAX_IMAGES } from "../hooks/usePropertyPhotos"; // Import MAX_IMAGES
import Button from "../components/button";
import "../styles/PropertyPhotosView.css";

// Define minimum required photos
const MIN_IMAGES_REQUIRED = 5;

function PhotosView() {
    const { type: accommodationType } = useParams();
    const {
        images,
        handleFileChange,
        deleteImage,
        reorderImages,
        isInitialDragOver, // Renamed for clarity
        setIsInitialDragOver,
    } = usePhotos();

    const [draggedIndex, setDraggedIndex] = useState(null);
    const [isGridDragOver, setIsGridDragOver] = useState(false); // For D&D upload onto the grid
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

    // Triggers file input click
    const triggerFileInput = useCallback(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset input value for same file selection
            fileInputRef.current.click();
        }
    }, []);

    // Handles file selection from input
    const onFileSelected = useCallback((event) => {
        if (event.target.files) {
            handleFileChange(event.target.files);
        }
    }, [handleFileChange]);

    // Handles files dropped onto designated drop zones (initial or grid)
    const handleDropUpload = useCallback((event) => {
        event.preventDefault();
        setIsInitialDragOver(false);
        setIsGridDragOver(false);
        if (event.dataTransfer.files) {
            // Check if we haven't reached the max limit before processing
            if (images.length < MAX_IMAGES) {
                handleFileChange(event.dataTransfer.files);
            } else {
                // Optionally show a toast message here if needed
                console.warn(`Maximum images (${MAX_IMAGES}) reached. Drop ignored.`);
            }
        }
    }, [handleFileChange, images.length]);

    // Drag over the main grid area
    const handleGridDragOver = useCallback((event) => {
        event.preventDefault();
        // Only show grid feedback if not already dragging an existing image for reorder
        if (draggedIndex === null && images.length < MAX_IMAGES) {
            setIsGridDragOver(true);
        }
    }, [draggedIndex, images.length]);

    const handleGridDragLeave = useCallback(() => {
        setIsGridDragOver(false);
    }, []);

    // Drag over the initial placeholder area
    const handleInitialDragOver = useCallback((event) => {
        event.preventDefault();
        setIsInitialDragOver(true);
    }, []);

    const handleInitialDragLeave = useCallback(() => {
        setIsInitialDragOver(false);
    }, []);

    const isProceedDisabled = images.length < MIN_IMAGES_REQUIRED;
    const showAddMore = images.length > 0 && images.length < MAX_IMAGES;

    return (
        <main className="photo-gallery-container">
            <h2 className="photo-gallery-title">
                Property Photos ({images.length} / {MAX_IMAGES})
            </h2>
            <p className="photo-gallery-subtitle">
                Add at least {MIN_IMAGES_REQUIRED} photos. The first photo will be the cover image. Drag to reorder.
            </p>

            {/* Hidden File Input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={onFileSelected}
                accept={ALLOWED_FORMATS.join(",")} // Use formats from hook if exported, or define here
                style={{ display: "none" }}
            />

            {/* Initial Upload Area (only when no images) */}
            {images.length === 0 && (
                <div
                    className={`drag-drop-area ${isInitialDragOver ? "drag-over" : ""}`}
                    onClick={triggerFileInput}
                    onDragOver={handleInitialDragOver}
                    onDragLeave={handleInitialDragLeave}
                    onDrop={handleDropUpload} // Use unified drop handler
                >
                    <p>Drag & drop photos here</p>
                    <p>or</p>
                    <button type="button" className="upload-button-styled">Click to upload</button>
                    <small>Min {MIN_WIDTH}x{MIN_HEIGHT}px, Max {MAX_IMAGES} photos</small>
                </div>
            )}

            {/* Image Grid (shown when images exist) */}
            {images.length > 0 && (
                <section
                    className={`photo-gallery-section ${isGridDragOver ? 'grid-drag-over' : ''}`}
                    onDragOver={handleGridDragOver}
                    onDragLeave={handleGridDragLeave}
                    onDrop={handleDropUpload} // Drop NEW files onto the grid background
                >
                    <div className="photo-gallery-images">
                        {images.map((image, index) => (
                            <ImagePreview
                                key={image.substring(image.length - 20) + index} // More robust key using part of data URL + index
                                image={image}
                                index={index}
                                onDelete={deleteImage}
                                onDragStart={handleDragStart}
                                onDrop={handleDropReorder}
                                isDragging={draggedIndex === index} // Pass dragging state
                            />
                        ))}

                        {/* "Add More" Box */}
                        {showAddMore && (
                            <div
                                className="small-photo add-more-box"
                                onClick={triggerFileInput}
                                role="button" // Semantics
                                tabIndex={0} // Make it focusable
                                onKeyPress={(e) => e.key === 'Enter' && triggerFileInput()} // Keyboard accessibility
                            >
                                <span className="add-more-icon">+</span>
                                <p>Add More</p>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Navigation Buttons */}
            <nav className="photo-gallery-navigation">
                <Button
                    routePath={`/hostonboarding/${accommodationType}/rules`} // Example path
                    btnText="Go back"
                    variant="secondary" // Example: Use button variants if your Button component supports it
                />
                <Button
                    routePath={`/hostonboarding/${accommodationType}/pricing`} // Example path
                    btnText="Proceed"
                    disabled={isProceedDisabled}
                    // className={isProceedDisabled ? "button-disabled" : ""} // Use Button component's disabled styling
                />
            </nav>
            {isProceedDisabled && (
                <p>
                    Please add at least {MIN_IMAGES_REQUIRED} photos to proceed.
                </p>
            )}
        </main>
    );
}

// Define allowed formats here if not exported from hook
const ALLOWED_FORMATS = ["image/jpeg", "image/png", "image/webp"];
const MIN_WIDTH = 500;
const MIN_HEIGHT = 500;


export default PhotosView;