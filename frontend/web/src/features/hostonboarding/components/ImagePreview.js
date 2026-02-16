import PropTypes from "prop-types";

function ImagePreview({ image, index, onDelete, onDragStart, onDrop }) {
  const src = typeof image === "string" ? image : image?.preview;

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
      {src ? (
        <>
          <img
            src={src}
            alt={`Preview ${index + 1}`}
            className={index === 0 ? "accommodation-thumbnail" : "file-image"}
          />
          <button className="image-delete-button" onClick={() => onDelete(index)}>
            X
          </button>
        </>
      ) : null}
    </div>
  );
}

ImagePreview.propTypes = {
  image: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      preview: PropTypes.string,
    }),
  ]).isRequired,
  index: PropTypes.number.isRequired,
  onDelete: PropTypes.func.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
};

export default ImagePreview;
