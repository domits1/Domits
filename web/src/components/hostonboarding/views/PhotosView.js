import { useParams } from "react-router-dom";
import ImagePreview from "../components/ImagePreview";
import { usePhotos } from "../hooks/usePhotos";
import Button from "../components/button";

function PhotosView() {
  const { type: accommodationType } = useParams();
  const { images, handleFileChange, deleteImage } = usePhotos();

  return (
    <main className="container">
      <h2 className="onboardingSectionTitle">
        Add photos of your accommodation
      </h2>
      <section className="accommodation-photos">
        <section className="accommodation-images">
          {[...Array(5)].map((_, index) => (
            <ImagePreview
              key={index}
              image={images[`image${index + 1}`]}
              index={index}
              onFileChange={handleFileChange}
              onDelete={deleteImage}
            />
          ))}
        </section>
      </section>
      <nav className="onboarding-button-box">
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
