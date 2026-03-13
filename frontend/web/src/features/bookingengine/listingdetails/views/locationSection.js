import PropTypes from "prop-types";
import { FaMapMarkerAlt } from "react-icons/fa";

const buildLocationLabel = (location = {}) => {
  return [location?.city, location?.country].filter(Boolean).join(", ");
};

const buildMapQuery = (location = {}) => {
  const query = [location?.street, location?.houseNumber, location?.city, location?.country]
    .filter(Boolean)
    .join(" ");

  return encodeURIComponent(query || buildLocationLabel(location) || "Amsterdam");
};

const LocationSection = ({ location }) => {
  const locationLabel = buildLocationLabel(location);
  const mapQuery = buildMapQuery(location);

  return (
    <section className="location-section">
      <div className="location-section__header">
        <span className="location-section__icon" aria-hidden="true">
          <FaMapMarkerAlt />
        </span>
        <div>
          <h3 className="location-section__title">Where you'll be</h3>
          {locationLabel && <p className="location-section__subtitle">{locationLabel}</p>}
        </div>
      </div>

      <div className="location-section__map-shell">
        <iframe
          className="location-section__map"
          title="Property location"
          src={`https://maps.google.com/maps?q=${mapQuery}&z=12&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
};

LocationSection.propTypes = {
  location: PropTypes.shape({
    street: PropTypes.string,
    houseNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    city: PropTypes.string,
    country: PropTypes.string,
  }),
};

export default LocationSection;
