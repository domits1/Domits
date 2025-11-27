import React from "react";

import ImageGallery from "../components/imageGallery";
import PricingPerNight from "../components/pricingPerNight";
import GeneralDetails from "../components/generalDetails";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";
import RulesContainer from "./rulesContainer";
import RangeCalendar from "./RangeCalendar";

const PropertyContainer = ({ property, onDateChange }) => {
  return (
    <div className="property-container">
      <ImageGallery images={property.images} />
      <PricingPerNight pricing={property.pricing} />
      <GeneralDetails generalDetails={property.generalDetails} />
      <Description description={property.property.description} />
      <hr />
      <AmenitiesContainer amenityIds={property.amenities} />
      <hr />
      <RangeCalendar
        propertyId={property?.property?.id}
        onChange={onDateChange}
      />
       <hr />
      <RulesContainer rules={property.rules} checkIn={property.checkIn} />
    </div>
  );
};

export default PropertyContainer;
