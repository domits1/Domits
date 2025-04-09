import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos from "../hooks/usePropertyPhotos";
import OnboardingButton from "../components/OnboardingButton";
import { useRef, useState } from "react";
import "../styles/PhotoVieuw.scss";

// step 7
function PhotosView() {
  const { type: accommodationType } = useParams();
  const {
    images,
    handleFileChange,
    deleteImage,
    reorderImages,
    isDragOver,
    setIsDragOver,
  } = usePhotos();

  const [draggedIndex, setDraggedIndex] = useState(null);
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
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  return (
    <div className="onboarding-host-div">
      <main className="photo-gallery-container">
        <h2 className="photo-gallery-title">Choose at least 5 photos</h2>

      {!images.length ? (
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
            handleFileChange(e.dataTransfer.files);
          }}
        >
          <p>Drag and drop your files here or click to upload</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileChange(e.target.files)}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <section className="photo-gallery-section">
          <section className="photo-gallery-images">
            {images.map((image, index) => (
              <ImagePreview
                key={index}
                image={image}
                index={index}
                onDelete={deleteImage}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
              />
            ))}
            {images.length < 5 && (
              <div
                className="small-photo add-more-box"
                onClick={handleBoxClick}
              >
                <p>Add More +</p>
              </div>
            )}
          </section>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileChange(e.target.files)}
            accept="image/*"
            style={{ display: "none" }}
          />
        </section>
      )}

        <nav className="photo-gallery-navigation">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/rules`}
            btnText="Go back"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/title`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PhotosView;
