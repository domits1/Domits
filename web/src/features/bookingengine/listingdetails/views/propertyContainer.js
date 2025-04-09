import React from "react";

import ImageGallery from "../components/imageGallery";
import PricingPerNight from "../components/pricingPerNight";
import GeneralDetails from "../components/generalDetails";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";
import RulesContainer from "./rulesContainer";

const PropertyContainer = ({ property }) => {
  return (
    <div className="property-container">
      <section className="image-section">
        <ImageGallery images={property.images} />
      </section>
      <PricingPerNight pricing={property.pricing} />
      <GeneralDetails generalDetails={property.generalDetails} />
      <Description description={property.property.description} />
      <hr />
      <AmenitiesContainer amenityIds={property.amenities} />
      <hr />
      <RulesContainer rules={property.rules} checkIn={property.checkIn} />
    </div>
  );
};

export default PropertyContainer;
