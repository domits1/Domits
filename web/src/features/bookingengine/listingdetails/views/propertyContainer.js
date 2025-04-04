import ImageGallery from "../components/imageGallery";
import Pricing from "../components/pricing";
import GeneralDetails from "../components/generalDetails";
import React from "react";

const PropertyContainer = ({ property }) => {
  return (
    <div className="property-container">
      <section className="image-section">
        <ImageGallery images={property.images} />
      </section>
      <Pricing pricing={property.pricing} />
      <GeneralDetails generalDetails={property.generalDetails} />
    </div>
  );
};

export default PropertyContainer;