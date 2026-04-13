import React from "react";
import PropTypes from "prop-types";

import ImageGallery from "../components/imageGallery";
import PricingPerNight from "../components/pricingPerNight";
import GeneralDetails from "../components/generalDetails";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";
import RangeCalendar from "./RangeCalendar";
import {
  parseHouseRules,
  parsePropertyRules,
  parseSafetyFeatures,
  parseCheckInOut,
  parseCancellationPolicyString,
  PolicySection,
} from "../../../../utils/policyDisplayUtils";

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
  const parsedHouseRules = React.useMemo(
    () => parseHouseRules([], property?.policyRules || {}),
    [property?.policyRules]
  );
  const parsedPropertyRules = React.useMemo(
    () => parsePropertyRules([], property?.policyRules || {}),
    [property?.policyRules]
  );
  const parsedSafetyFeatures = React.useMemo(
    () => parseSafetyFeatures([], property?.policyRules || {}),
    [property?.policyRules]
  );
  const checkInOut = React.useMemo(() => parseCheckInOut(property?.checkIn || {}), [property?.checkIn]);
  const cancellationPolicy = React.useMemo(
    () => parseCancellationPolicyString(property?.cancellationPolicy || ""),
    [property?.cancellationPolicy]
  );

  const checkInItems = [];
  if (checkInOut?.checkInFrom) {
    checkInItems.push(
      `Check-in: ${checkInOut.checkInFrom}` +
        (checkInOut.lateCheckIn ? ` - ${checkInOut.checkInTill} (Late check-in possible)` : "")
    );
  }
  if (checkInOut?.checkOutFrom) {
    checkInItems.push(
      `Check-out: ${checkInOut.checkOutFrom}` +
        (checkInOut.lateCheckOut ? ` - ${checkInOut.checkOutTill} (Late check-out possible)` : "")
    );
  }

  return (
    <div className="property-container">
      <section id="listing-photos" className="listing-section-block listing-section-block--photos">
        <ImageGallery images={property.images} propertyTitle={property?.property?.title} />
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
      <section id="listing-policies" className="listing-section-block">
        {cancellationPolicy && (
          <PolicySection
            title="Cancellation Policy"
            items={[cancellationPolicy.summary, ...cancellationPolicy.details]}
            expandable={true}
          />
        )}
        {parsedHouseRules.length > 0 && <PolicySection title="House Rules" items={parsedHouseRules} />}
        {parsedPropertyRules.length > 0 && <PolicySection title="Property Rules" items={parsedPropertyRules} />}
        {parsedSafetyFeatures.length > 0 && <PolicySection title="Safety & Property" items={parsedSafetyFeatures} />}
        {checkInItems.length > 0 && <PolicySection title="Check-in / Check-out" items={checkInItems} />}
        {/* <RulesContainer rules={property.rules} checkIn={property.checkIn} /> */}
      </section>
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
    policyRules: PropTypes.object,
    cancellationPolicy: PropTypes.string,
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
