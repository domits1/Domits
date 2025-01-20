import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import usePhotos from "./usePhotos";
import Button from "../components/button";
import { useState } from "react";
import './PhotoVieuw.css';

function PhotosView() {
  const { type: accommodationType } = useParams();
  const { images, handleFileChange, deleteImage, reorderImages } = usePhotos();
  const [draggedIndex, setDraggedIndex] = useState(null);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDrop = (index) => {
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderImages(draggedIndex, index);
    }
    setDraggedIndex(null);
  };

  return (
    <main className="photo-gallery-container">
      <h2 className="photo-gallery-title">Choose at least 5 photos</h2>
      <section className="photo-gallery-section">
        <section className="photo-gallery-images">
          {[...Array(5)].map((_, index) => (
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
        </section>
      </section>
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
