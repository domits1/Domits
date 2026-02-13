import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos from "../hooks/usePropertyPhotos";
import OnboardingButton from "../components/OnboardingButton";
import { useRef, useState } from "react";
import "../styles/PhotoVieuw.scss";
import { useBuilder } from "../../../context/propertyBuilderContext";
import { toast } from "react-toastify";
import cloudIcon from "../../../images/icons/cloud-01.png";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

// step 7
function PhotosView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const MIN_IMAGES = 2;
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
        <OnboardingProgress />
        <h2 className="photo-gallery-title">Choose at least {MIN_IMAGES} photos</h2>

        {!images.length ? (
          <button
            type="button"
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
            <div className="drag-drop-content">
              <div className="drag-drop-icon" aria-hidden="true">
                <img src={cloudIcon} alt="" />
              </div>
              <p className="drag-drop-title">Choose a file or drag &amp; drop it here</p>
              <p className="drag-drop-subtitle">JPEG, PNG, WEBP up to 5 MB each</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileChange(e.target.files)}
              style={{ display: "none" }}
            />
          </button>
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
            {images.length < 10 && (
              <button
                type="button"
                className="small-photo add-more-box"
                onClick={handleBoxClick}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileChange(e.dataTransfer.files);
                }}
              >
                <div className="drag-drop-content">
                  <div className="drag-drop-icon" aria-hidden="true">
                    <img src={cloudIcon} alt="" />
                  </div>
                  <p className="drag-drop-title">Choose a file or drag &amp; drop it here</p>
                  <p className="drag-drop-subtitle">JPEG, PNG, WEBP up to 5 MB each</p>
                </div>
              </button>
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
            routePath={prevPath || `/hostonboarding/${accommodationType}/rules`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              if (images.length < MIN_IMAGES) {
                toast.error(`Upload at least ${MIN_IMAGES} photos to continue.`);
                return false;
              }
              return true;
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/title`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PhotosView;
