import React from "react";
import PropTypes from "prop-types";

import ImageGallery from "../components/imageGallery";
import PricingPerNight from "../components/pricingPerNight";
import GeneralDetails from "../components/generalDetails";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";
import RulesContainer from "./rulesContainer";
import RangeCalendar from "./RangeCalendar";

const PropertyContainer = ({
  property = {
    images: [],
    pricing: {},
    generalDetails: [],
    property: { description: "" },
    amenities: [],
    calendarAvailability: { externalBlockedDates: [] },
    rules: [],
    checkIn: { checkIn: {}, checkOut: {} },
  },
  unavailableDateKeys = [],
  checkInDate = "",
  checkOutDate = "",
  setCheckInDate,
  setCheckOutDate,
}) => {
  return (
    <div className="property-container">
      <section id="listing-photos" className="listing-section-block listing-section-block--photos">
        <ImageGallery images={property.images} />
        <PricingPerNight pricing={property.pricing} />
        <GeneralDetails generalDetails={property.generalDetails} />
      </section>
      <section id="listing-about" className="listing-section-block">
        <Description description={property.property.description} />
      </section>
      <section id="listing-amenities" className="listing-section-block">
        <AmenitiesContainer amenityIds={property.amenities} />
      </section>
      <section id="listing-availability" className="listing-section-block">
        <RangeCalendar
          unavailableDateKeys={unavailableDateKeys}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          onRangeChange={(nextCheckInDate, nextCheckOutDate) => {
            setCheckInDate(nextCheckInDate);
            setCheckOutDate(nextCheckOutDate);
          }}
        />
      </section>
      {/* <RulesContainer rules={property.rules} checkIn={property.checkIn} /> */}
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

export default PropertyContainer;
