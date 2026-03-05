import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos from "../hooks/usePropertyPhotos";
import OnboardingButton from "../components/OnboardingButton";
import { useRef, useState } from "react";
import "../styles/PhotoVieuw.scss";
import { toast } from "react-toastify";
import cloudIcon from "../../../images/icons/cloud-01.png";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";

// step 7
function PhotosView() {
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const MIN_IMAGES = 5;
  const MAX_IMAGES = 60;
  const ACCEPTED_FILE_TYPES = "JPG, JPEG, PNG, WEBP";
  const MAX_FILE_SIZE_MB = 5;
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
        <header className="photo-gallery-header">
          <h2 className="photo-gallery-title">Choose at least {MIN_IMAGES} photos</h2>
          <a
            className="photo-gallery-header-link"
            href="https://bookdomits.com/how-to-take-great-photos-vacation-rentals/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read full photo tips / photo policies
          </a>
        </header>
        <p className="photo-gallery-subtitle">
          Upload up to {MAX_IMAGES} photos. Accepted file types: {ACCEPTED_FILE_TYPES}. Max {MAX_FILE_SIZE_MB} MB
          per file.
        </p>

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
              <p className="drag-drop-subtitle">
                {ACCEPTED_FILE_TYPES} up to {MAX_FILE_SIZE_MB} MB each, minimum 1024 x 683 px
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileChange(e.target.files)}
              accept=".jpg,.jpeg,.png,.webp"
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
            {images.length < MAX_IMAGES && (
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
                  <p className="drag-drop-subtitle">
                    {ACCEPTED_FILE_TYPES} up to {MAX_FILE_SIZE_MB} MB each, minimum 1024 x 683 px
                  </p>
                </div>
              </button>
            )}
            </section>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileChange(e.target.files)}
              accept=".jpg,.jpeg,.png,.webp"
              style={{ display: "none" }}
            />
          </section>
        )}
        <section className="photo-guidelines">
          <h3>Photo Guidelines</h3>
          <ul>
            <li>
              Camera: Use a DSLR or a high-quality smartphone (latest iPhones or flagship Android devices).
            </li>
            <li>
              Lighting: Use natural daylight. Open curtains and switch on interior lights.
            </li>
            <li>Orientation: Always shoot in landscape (horizontal) mode.</li>
            <li>
              Staging: Declutter, clean, and add cozy touches (fresh towels, plants, wine glasses).
            </li>
            <li>
              Editing: Light edits only (brightness, contrast, warmth). Do not use heavy filters that distort reality.
            </li>
            <li>Minimum resolution: 1024 x 683 px (3:2 aspect ratio).</li>
            <li>Ideal resolution: 3840 x 2560 px (4K) or 1920 x 1280 px.</li>
          </ul>
        </section>

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
