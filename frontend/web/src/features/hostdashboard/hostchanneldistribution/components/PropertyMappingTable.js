import React, { useState } from "react";
import PropTypes from "prop-types";

// Mirrors getChannexAriTargets's real response shape: { ready, missingMappings }.
// ready -> Mapped. Otherwise: nothing linked yet (PROPERTY_MAPPING_MISSING present) -> Not
// mapped; the property itself is linked but a room type/rate plan piece is missing -> Issue.
function getMappingBadge(mapping) {
  if (mapping?.ready) {
    return { tone: "success", label: "Mapped" };
  }
  const missingMappings = Array.isArray(mapping?.missingMappings) ? mapping.missingMappings : [];
  if (missingMappings.includes("PROPERTY_MAPPING_MISSING")) {
    return { tone: "pending", label: "Not mapped" };
  }
  return { tone: "error", label: "Issue" };
}

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const pluralize = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;

// Only the parts that are actually known: a missing count is left out rather than rendered as
// "undefined guests".
const buildMetaLine = ({ guests, bedrooms, bathrooms }) =>
  [
    isFiniteNumber(guests) && pluralize(guests, "guest"),
    isFiniteNumber(bedrooms) && pluralize(bedrooms, "bedroom"),
    isFiniteNumber(bathrooms) && pluralize(bathrooms, "bathroom"),
  ]
    .filter(Boolean)
    .join(" · ");

const formatEuroAmount = (amount) => `EUR ${amount.toLocaleString("en-US")}`;

// A separate component (not inline in the row map) so the per-row "did this URL fail to load"
// state is its own hook, not one hook shared across every row.
function PropertyThumbnail({ image, alt }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (!image || imageFailed) {
    return <div className="chdist-property-row__thumb chdist-property-row__thumb--fallback">No image</div>;
  }

  return (
    <img className="chdist-property-row__thumb" src={image} alt={alt} onError={() => setImageFailed(true)} />
  );
}

PropertyThumbnail.propTypes = {
  image: PropTypes.string,
  alt: PropTypes.string.isRequired,
};

function PropertyMappingTable({ properties }) {
  if (properties.length === 0) {
    return <p className="host-chdist__empty-text">No properties to show yet.</p>;
  }

  return (
    <div className="chdist-property-table">
      {properties.map((property) => {
        const badge = getMappingBadge(property.mapping);
        const metaLine = buildMetaLine(property);
        const hasNights = isFiniteNumber(property.availableNights) && isFiniteNumber(property.totalNights);

        return (
          <div className="chdist-property-row" key={property.id}>
            <PropertyThumbnail image={property.image} alt={`${property.title} thumbnail`} />

            <div className="chdist-property-row__info">
              <p className="chdist-property-row__title">{property.title}</p>
              {metaLine && <p className="chdist-property-row__meta">{metaLine}</p>}
              <p className="chdist-property-row__location">{property.location}</p>
            </div>

            <div className="chdist-property-row__side">
              <span className={`chdist-badge chdist-badge--${badge.tone}`}>{badge.label}</span>
              {hasNights && (
                <span className="chdist-property-row__availability">
                  {property.availableNights}/{property.totalNights} nights free
                </span>
              )}
              {isFiniteNumber(property.nightlyRate) && (
                <span className="chdist-property-row__price">{formatEuroAmount(property.nightlyRate)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

PropertyMappingTable.propTypes = {
  properties: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      location: PropTypes.string,
      image: PropTypes.string,
      guests: PropTypes.number,
      bedrooms: PropTypes.number,
      bathrooms: PropTypes.number,
      mapping: PropTypes.shape({
        ready: PropTypes.bool,
        missingMappings: PropTypes.arrayOf(PropTypes.string),
      }),
      availableNights: PropTypes.number,
      totalNights: PropTypes.number,
      nightlyRate: PropTypes.number,
    })
  ).isRequired,
};

export default PropertyMappingTable;
