function ImagePreview({ image, index, onDelete, onDragStart, onDrop }) {
  return (
    <div
      className={index === 0 ? "large-photo" : "small-photo"}
      draggable
      onDragStart={() => onDragStart(index)}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {image ? (
        <>
          <img
            src={image}
            alt={`Preview ${index + 1}`}
            className={index === 0 ? "accommodation-thumbnail" : "file-image"}
          />
          <button className="image-delete-button" onClick={() => onDelete(index)}>
            ❌
          </button>
        </>
      ) : null}
    </div>
  );
}

export default ImagePreview;
