import React, { useMemo } from "react";
import PropTypes from "prop-types";
import Amenities from "../../../store/amenities";

const amenitiesScrollBoxStyle = {
  maxHeight: 300,
  overflowY: "auto",
};

function AmenitiesSection({ amenityIds = [] }) {
  const amenityObjects = useMemo(() => {
    if (!Array.isArray(amenityIds)) {
      return [];
    }

    return amenityIds
      .map((item) => Amenities.find((entry) => entry.id === item?.amenityId))
      .filter(Boolean);
  }, [amenityIds]);

  return (
    <div className="card">
      <h3>Amenities</h3>

      {amenityObjects.length === 0 ? (
        <p>No amenities have been listed for this property.</p>
      ) : (
        <ul style={amenitiesScrollBoxStyle}>
          {amenityObjects.map((amenity) => (
            <li key={amenity.id}>{amenity.amenity}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

AmenitiesSection.propTypes = {
  amenityIds: PropTypes.arrayOf(
    PropTypes.shape({
      amenityId: PropTypes.string,
    })
  ),
};

export default AmenitiesSection;