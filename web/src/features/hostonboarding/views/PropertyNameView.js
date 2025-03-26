import { useParams } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import Button from "../components/button";

function AccommodationTitleView() {
  const { type: accommodationType } = useParams();
  const { title, subtitle, handleInputChange } = useAccommodationTitle();

  return (
    <main className="container">
      <h2 className="onboardingSectionTitle">Name your accommodation</h2>
      <p className="onboardingSectionSubtitle">
        A short title works best. Don't worry, you can always change it later.
      </p>

      <TextAreaField
        label="Title"
        value={title}
        onChange={(value) => handleInputChange("title", value)}
        maxLength={128}
        placeholder="Enter your title here..."
      />

      <h2 className="onboardingSectionTitle">Give it a suitable subtitle</h2>

      <TextAreaField
        label="Subtitle"
        value={subtitle}
        onChange={(value) => handleInputChange("subtitle", value)}
        maxLength={128}
        placeholder="Enter your subtitle here..."
      />

      <nav className="onboarding-button-box">
        <Button
          routePath={`/hostonboarding/${accommodationType}/photos`}
          btnText="Go back"
        />
        <Button
          routePath={`/hostonboarding/${accommodationType}/description`}
          btnText="Proceed"
        />
      </nav>
    </main>
  );
}

export default AccommodationTitleView;
