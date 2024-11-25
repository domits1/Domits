import React from "react";

function ImagePreview({ image, index, onFileChange, onDelete }) {
  return (
    <section className="images-container">
      <input
        type="file"
        onChange={(e) => onFileChange(e.target.files[0], index)}
        accept="image/*"
        className="file-input"
        required={true}
      />
      {image ? (
        <>
          <img
            src={image}
            alt={`Image-${index + 1}`}
            className={index === 0 ? "accommodation-thumbnail" : "file-image"}
          />
          <button className="delete-button" onClick={() => onDelete(index)}>
            Delete
          </button>
        </>
      ) : (
        <div className="placeholder">Image {index + 1}</div>
      )}
    </section>
  );
}

export default ImagePreview;