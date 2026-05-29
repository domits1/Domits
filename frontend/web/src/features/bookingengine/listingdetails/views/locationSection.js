import { useContext, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { FaMapMarkerAlt } from "react-icons/fa";
import { LanguageContext } from "../../../../context/LanguageContext.js";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const buildLocationLabel = (location = {}) => {
  return [location?.city, location?.country].filter(Boolean).join(", ");
};

const buildMapQuery = (location = {}) => {
  const query = [location?.city, location?.country]
    .filter(Boolean)
    .join(", ");
  return encodeURIComponent(query);
};

const LocationSection = ({ location }) => {
  const { language } = useContext(LanguageContext);
  const t = (contentByLanguage[language] ?? contentByLanguage.en).listingDetails.location;

  const locationLabel = buildLocationLabel(location);
  const hasUsableLocation = Boolean(location?.city || location?.country);

  const [mapKey, setMapKey] = useState(0);
  const resetMap = useCallback(() => setMapKey((k) => k + 1), []);

  return (
    <section className="location-section">
      <div className="location-section__header">
        <span className="location-section__icon" aria-hidden="true">
          <FaMapMarkerAlt />
        </span>
        <div>
          <h3 className="location-section__title">{t.title}</h3>
          {locationLabel && <p className="location-section__subtitle">{locationLabel}</p>}
        </div>
      </div>

      {hasUsableLocation ? (
        <>
          <div className="location-section__map-shell">
            <iframe
              key={mapKey}
              className="location-section__map"
              title={t.title}
              src={`https://maps.google.com/maps?q=${buildMapQuery(location)}&z=14&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <button
              className="location-section__reset-btn"
              onClick={resetMap}
              aria-label="Reset map view"
              type="button"
            >
              <FaMapMarkerAlt />
            </button>
          </div>
          <p className="location-section__disclaimer">{t.disclaimer}</p>
        </>
      ) : (
        <p className="location-section__unavailable">{t.unavailable}</p>
      )}
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
