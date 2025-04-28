// --- START OF FILE ImagePreview.js ---

import React from 'react';

// Simple SVG Delete Icon Component (or import from an icon library)
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px">
    <path d="M0 0h24v24H0z" fill="none"/>
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>
);

function ImagePreview({
                        image,
                        index,
                        isDragging,     // Is this specific item being dragged?
                        isDragOver,     // Is another item being dragged over this one?
                        onDelete,
                        onDragStart,
                        onDropReorder,  // Renamed from onDrop for clarity
                        onDragEnterReorder, // To indicate hover target
                        onDragLeaveReorder, // To clear hover target
                      }) {

  const handleDragStart = (e) => {
    // Optional: Set drag image preview (can be complex)
    // e.dataTransfer.setData('text/plain', index); // Required for Firefox drag events
    onDragStart(index);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onDropReorder(index); // Drop happened *on* this item's index
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    onDragEnterReorder(index); // Hovering *over* this item's index
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    onDragLeaveReorder(); // Leaving the hover area
  };

  // Combine classes based on state
  const classes = [
    'image-preview-wrapper',
    isDragging ? 'dragging' : '',
    isDragOver ? 'drag-over-reorder' : '',
  ].filter(Boolean).join(' '); // Filter out empty strings

  return (
    <div
      className={classes}
      draggable // Make the wrapper draggable
      onDragStart={handleDragStart}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      {/* Conditionally render image if src is available */}
      {image ? (
        <>
          <img
            src={image}
            alt={`Preview ${index + 1}`}
            className="image-preview-img"
            // Prevent native image dragging which can interfere
            draggable="false"
          />
          <button
            type="button"
            className="image-delete-button"
            onClick={() => onDelete(index)}
            aria-label={`Delete image ${index + 1}`}
          >
            <DeleteIcon />
          </button>
          {/* Optional: Display index number or "Cover" text */}
          {index === 0 && <span className="image-cover-label">Cover</span>}
        </>
      ) : (
        // Placeholder if needed, though usually not rendered if image exists
        <div className="placeholder">Loading...</div>
      )}
    </div>
  );
}

export default ImagePreview;
// --- END OF FILE ImagePreview.js ---