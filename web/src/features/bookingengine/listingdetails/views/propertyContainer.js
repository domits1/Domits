import ImageGallery from "../components/imageGallery";
import PricingPerNight from "../components/pricingPerNight";
import GeneralDetails from "../components/generalDetails";
import React from "react";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";

const PropertyContainer = ({ property }) => {
  return (
    <div className="property-container">
      <section className="image-section">
        <ImageGallery images={property.images} />
      </section>
      <PricingPerNight pricing={property.pricing} />
      <GeneralDetails generalDetails={property.generalDetails} />
      <Description description={property.property.description} />
      <AmenitiesContainer amenityIds={property.amenities} />
    </div>
  );
};

export default PropertyContainer;
