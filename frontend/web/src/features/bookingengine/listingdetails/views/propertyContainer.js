import React from "react";
import PropTypes from "prop-types";

import ImageGallery from "../components/imageGallery";
import AmenitiesContainer from "./amenitiesContainer";
import Description from "../components/description";
import RangeCalendar from "./RangeCalendar";
import WhereYoullStay from "../components/WhereYoullStay";
import HostSection from "../components/HostSection";
import LocationSection from "./locationSection";
import {
  getActiveCancellationPolicyId,
  parseHouseRules,
  parsePropertyRules,
  parseSafetyFeatures,
  parseCheckInOut,
  parseCancellationPolicy,
  parseCancellationPolicyString,
  PolicySection,
} from "../../../../utils/policyDisplayUtils";
import "../../components/ListingPolicySections.css";

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
  host = {},
  location = {},
  onContactHost,
  unavailableDateKeys = [],
  availabilityRanges = null,
  availableDateKeys = [],
  checkInDate = "",
  checkOutDate = "",
  setCheckInDate,
  setCheckOutDate,
  children,
}) => {
  const policyRules = React.useMemo(
    () =>
      (property?.rules || []).reduce((acc, rule) => {
        if (rule?.rule) {
          acc[rule.rule] = rule.value;
        }
        return acc;
      }, {}),
    [property?.rules]
  );

  const parsedHouseRules = React.useMemo(
    () => parseHouseRules(policyRules, property?.policyRules || {}),
    [policyRules, property?.policyRules]
  );
  const parsedPropertyRules = React.useMemo(
    () => parsePropertyRules(policyRules, property?.policyRules || {}),
    [policyRules, property?.policyRules]
  );
  const parsedSafetyFeatures = React.useMemo(
    () => parseSafetyFeatures(policyRules, property?.policyRules || {}),
    [policyRules, property?.policyRules]
  );
  const checkInOut = React.useMemo(
    () => parseCheckInOut(property?.checkIn || {}, policyRules),
    [property?.checkIn, policyRules]
  );
  const activeCancellationPolicyId = React.useMemo(
    () => getActiveCancellationPolicyId(property?.rules || []) || getActiveCancellationPolicyId(policyRules),
    [property?.rules, policyRules]
  );
  const hasAmenities = Array.isArray(property?.amenities) && property.amenities.length > 0;
  const fallbackCancellationPolicy = React.useMemo(() => {
    if (property?.cancellationPolicy) {
      return parseCancellationPolicyString(property.cancellationPolicy);
    }

    return parseCancellationPolicy(property?.rules || []);
  }, [property?.cancellationPolicy, property?.rules]);
  const cancellationPolicy = React.useMemo(
    () => (activeCancellationPolicyId ? parseCancellationPolicyString(activeCancellationPolicyId) : fallbackCancellationPolicy),
    [activeCancellationPolicyId, fallbackCancellationPolicy]
  );

  const checkInItems = [];
  if (checkInOut?.checkInFrom) {
    checkInItems.push(
      `Check-in: ${checkInOut.checkInFrom}` +
        (checkInOut.checkInTill && checkInOut.checkInTill !== checkInOut.checkInFrom
          ? ` - ${checkInOut.checkInTill}`
          : "") +
        (checkInOut.lateCheckinEnabled ? " (Late check-in possible)" : "")
    );
  }
  if (checkInOut?.checkOutFrom) {
    checkInItems.push(
      `Check-out: ${checkInOut.checkOutFrom}` +
        (checkInOut.checkOutTill && checkInOut.checkOutTill !== checkInOut.checkOutFrom
          ? ` - ${checkInOut.checkOutTill}`
          : "")
    );
  }

  return (
    <div className="property-container">
      <section id="listing-photos" className="listing-section-block listing-section-block--photos">
        <ImageGallery
          images={property.images}
          propertyTitle={property?.property?.title}
          propertyId={property?.property?.id}
        />
      </section>

      {children}

      <div className="listing-details-content-stack">
        <section className="listing-section-block">
          <Description description={property?.property?.description} />
        </section>

        <section className="listing-section-block">
          <WhereYoullStay generalDetails={property.generalDetails} />
        </section>

        {hasAmenities && (
          <section id="listing-amenities" className="listing-section-block">
            <AmenitiesContainer amenityIds={property.amenities} />
          </section>
        )}

        <section id="listing-availability" className="listing-section-block">
          <RangeCalendar
            unavailableDateKeys={unavailableDateKeys}
            availabilityRanges={availabilityRanges}
            availableDateKeys={availableDateKeys}
            checkInDate={checkInDate}
            checkOutDate={checkOutDate}
            onRangeChange={(nextCheckInDate, nextCheckOutDate) => {
              setCheckInDate(nextCheckInDate);
              setCheckOutDate(nextCheckOutDate);
            }}
          />
        </section>

        <section id="listing-host" className="listing-section-block">
          <HostSection host={host} onContactHost={onContactHost} />
        </section>

        <section id="listing-location" className="listing-section-block">
          <LocationSection location={location} />
        </section>

        <section id="listing-policies" className="listing-section-block">
          {cancellationPolicy && (
            <PolicySection
              title="Cancellation Policy"
              items={[
                {
                  summary: cancellationPolicy.summary,
                  badge: cancellationPolicy.type
                    ? {
                        label: cancellationPolicy.type,
                        color: cancellationPolicy.color,
                      }
                    : null,
                },
                ...(cancellationPolicy.details || []),
              ]}
              expandable={true}
            />
          )}
          {parsedHouseRules.length > 0 && <PolicySection title="House Rules" items={parsedHouseRules} />}
          {parsedPropertyRules.length > 0 && <PolicySection title="Property Rules" items={parsedPropertyRules} />}
          {parsedSafetyFeatures.length > 0 && <PolicySection title="Safety & Property" items={parsedSafetyFeatures} />}
          {checkInItems.length > 0 && <PolicySection title="Check-in / Check-out" items={checkInItems} />}
        </section>
      </div>
    </div>
  );
};

PropertyContainer.propTypes = {
  location: PropTypes.shape({
    street: PropTypes.string,
    houseNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    city: PropTypes.string,
    country: PropTypes.string,
  }),
  property: PropTypes.shape({
    images: PropTypes.array,
    pricing: PropTypes.shape({
      roomRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      cleaning: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    generalDetails: PropTypes.array,
    property: PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      description: PropTypes.string,
    }),
    amenities: PropTypes.array,
    calendarAvailability: PropTypes.shape({
      externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
    }),
    rules: PropTypes.array,
    policyRules: PropTypes.object,
    cancellationPolicy: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    checkIn: PropTypes.shape({
      checkIn: PropTypes.shape({
        from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
      checkOut: PropTypes.shape({
        from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    }),
  }),
  host: PropTypes.object,
  onContactHost: PropTypes.func,
  children: PropTypes.node,
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  availabilityRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      end: PropTypes.number.isRequired,
    })
  ),
  availableDateKeys: PropTypes.arrayOf(PropTypes.string),
  checkInDate: PropTypes.string,
  checkOutDate: PropTypes.string,
  setCheckInDate: PropTypes.func.isRequired,
  setCheckOutDate: PropTypes.func.isRequired,
};

export default PropertyContainer;
