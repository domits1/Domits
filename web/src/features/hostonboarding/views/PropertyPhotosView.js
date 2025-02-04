import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos from "../hooks/usePhotos";
import Button from "../components/button";
import { useRef, useState } from "react";
import "./PhotoVieuw.css";

function PhotosView() {
  const { type: accommodationType } = useParams();
  const {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
    isDragOver,
    setIsDragOver,
    handleDropFiles,
  } = usePhotos();

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [imageCount, setImageCount] = useState(5); 
  const fileInputRef = useRef(null);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDrop = (index) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderImages(draggedIndex, index);
    }
    setDraggedIndex(null);
  };

  const handleBoxClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddMore = () => {
    setImageCount((prev) => prev + 1);
  };

  return (
    <main className="photo-gallery-container">
      <h2 className="photo-gallery-title">Choose at least 5 photos</h2>

      {!Object.keys(images).length ? (
        <div
          className={`drag-drop-area ${isDragOver ? "drag-over" : ""}`}
          onClick={handleBoxClick}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleDropFiles(e.dataTransfer.files);
          }}
        >
          <p>Drag and drop your files here or click to upload</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleDropFiles(e.target.files)}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <section className="photo-gallery-section">
          <section className="photo-gallery-images">
            {[...Array(imageCount)].map((_, index) => (
              <ImagePreview
                key={index}
                image={images[`image${index + 1}`] || null}
                index={index}
                onFileChange={handleFileChange}
                onDelete={deleteImage}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              />
            ))}
            {/* Add More Box */}
            <div className="small-photo add-more-box" onClick={handleAddMore}>
              <p>Add More +</p>
            </div>
          </section>
        </section>
      )}

      <nav className="photo-gallery-navigation">
        <Button
          routePath={`/hostonboarding/${accommodationType}/rules`}
          btnText="Go back"
        />
        <Button
          routePath={`/hostonboarding/${accommodationType}/title`}
          btnText="Proceed"
        />
      </nav>
    </main>
  );
}

export default PhotosView;
