import React from 'react';

// Add isDragging prop for visual feedback
function ImagePreview({ image, index, onDelete, onDragStart, onDrop, isDragging }) {
    const isCover = index === 0;
    const containerClass = isCover ? "large-photo" : "small-photo";
    const imageClass = isCover ? "accommodation-thumbnail" : "file-image";

    // Add the 'dragging' class if this element is being dragged
    const draggingClass = isDragging ? 'dragging' : '';

    return (
        <div
            className={`${containerClass} ${draggingClass}`} // Apply dragging class here
            draggable // Make the div draggable
            onDragStart={(e) => {
                // Optional: Set custom drag image (can be tricky to style)
                // e.dataTransfer.setData('text/plain', index); // Required for Firefox
                onDragStart(index);
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent parent drop handler (for adding files)
                onDrop(index);
            }}
            onDragOver={(e) => {
                e.preventDefault(); // Necessary to allow dropping
                e.stopPropagation(); // Prevent parent dragOver handler
                // Add visual cue for potential drop target (e.g., border)
                // This could be done by adding a class like 'drag-over-target' here
                // Or managing state in the parent component
            }}
            // Add onDragEnter/onDragLeave for more precise drop target styling if needed
        >
            {image ? (
                <>
                    <img
                        src={image}
                        alt={`Preview ${index + 1}${isCover ? ' (Cover)' : ''}`}
                        className={imageClass}
                        // Prevent browser's default image dragging behavior
                        draggable="false"
                    />
                    {/* Add a label for the cover photo */}
                    {isCover && <span className="cover-photo-label">Cover Photo</span>}
                    <button
                        type="button" // Good practice for buttons not submitting forms
                        className="image-delete-button"
                        onClick={() => onDelete(index)}
                        aria-label={`Delete image ${index + 1}`} // Accessibility
                    >
                        ❌
                    </button>
                </>
            ) : (
                // Placeholder in case image data is missing (shouldn't happen with current logic)
                <div className="image-placeholder">Missing Image</div>
            )}
        </div>
    );
}

export default ImagePreview;