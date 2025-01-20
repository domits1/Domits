function ImagePreview({ image, index, onFileChange, onDelete, onDragStart, onDrop, onDragOver }) {
    return (
      <div
        className={index === 0 ? "large-photo" : "small-photo"}
        draggable
        onDragStart={() => {
          onDragStart(index);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(index);
        }}
        onDragOver={(e) => {
          e.preventDefault();
        }}
      >
        {image ? (
          <>
            <img
              src={image}
              alt={`Preview ${index + 1}`}
              className={index === 0 ? "accommodation-thumbnail" : "file-image"}
            />
            <button
              className="delete-button"
              onClick={() => {
                onDelete(index);
              }}
            >
              Delete
            </button>
          </>
        ) : (
          <input
            type="file"
            onChange={(e) => {
              onFileChange(e.target.files[0], index);
            }}
            accept="image/*"
            className="file-input"
            required
          />
        )}
      </div>
    );
  }
  
  export default ImagePreview;
  