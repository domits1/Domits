import React from "react";
import PropTypes from "prop-types";

import ImageGallery from "../components/imageGallery";
import PricingPerNight from "../components/pricingPerNight";
import GeneralDetails from "../components/generalDetails";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";
import RulesContainer from "./rulesContainer";
import RangeCalendar from "./RangeCalendar";
import LocationSection from "./locationSection";

const PropertyContainer = ({ property }) => {
  return (
    <div className="property-container">
      <ImageGallery images={property.images} />
      <PricingPerNight pricing={property.pricing} />
      <GeneralDetails generalDetails={property.generalDetails} />
      <Description description={property.property.description} />
      <AmenitiesContainer amenityIds={property.amenities} />
      <RangeCalendar />
      <LocationSection location={property.location} />
      <RulesContainer rules={property.rules} checkIn={property.checkIn} />
    </div>
  );
};

PropertyContainer.propTypes = {
  property: PropTypes.shape({
    images: PropTypes.array,
    pricing: PropTypes.shape({
      roomRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      cleaning: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    generalDetails: PropTypes.array,
    property: PropTypes.shape({
      description: PropTypes.string,
    }),
    amenities: PropTypes.array,
    location: PropTypes.shape({
      street: PropTypes.string,
      houseNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      city: PropTypes.string,
      country: PropTypes.string,
    }),
    rules: PropTypes.array,
    checkIn: PropTypes.shape({
      checkIn: PropTypes.shape({
        from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
      checkOut: PropTypes.shape({
        from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    }),
  }),
};

PropertyContainer.defaultProps = {
  property: {
    images: [],
    pricing: {},
    generalDetails: [],
    property: { description: "" },
    amenities: [],
    location: {},
    rules: [],
    checkIn: { checkIn: {}, checkOut: {} },
  },
};

export default PropertyContainer;
