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

const PropertyContainer = ({
  property,
  unavailableDateKeys,
  checkInDate,
  checkOutDate,
  setCheckInDate,
  setCheckOutDate,
}) => {
  return (
    <div className="property-container">
      <ImageGallery images={property.images} />
      <PricingPerNight pricing={property.pricing} />
      <GeneralDetails generalDetails={property.generalDetails} />
      <Description description={property.property.description} />
      <AmenitiesContainer amenityIds={property.amenities} />
      <RangeCalendar
        unavailableDateKeys={unavailableDateKeys}
        checkInDate={checkInDate}
        checkOutDate={checkOutDate}
        onRangeChange={(nextCheckInDate, nextCheckOutDate) => {
          setCheckInDate(nextCheckInDate);
          setCheckOutDate(nextCheckOutDate);
        }}
      />
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
    calendarAvailability: PropTypes.shape({
      externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
    }),
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
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  checkInDate: PropTypes.string,
  checkOutDate: PropTypes.string,
  setCheckInDate: PropTypes.func.isRequired,
  setCheckOutDate: PropTypes.func.isRequired,
};

PropertyContainer.defaultProps = {
  property: {
    images: [],
    pricing: {},
    generalDetails: [],
    property: { description: "" },
    amenities: [],
    calendarAvailability: { externalBlockedDates: [] },
    location: {},
    rules: [],
    checkIn: { checkIn: {}, checkOut: {} },
  },
  unavailableDateKeys: [],
  checkInDate: "",
  checkOutDate: "",
};

export default PropertyContainer;
