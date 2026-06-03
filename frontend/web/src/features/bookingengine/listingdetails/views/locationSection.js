import { useContext } from "react";
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
          <div className="location-section__map-shell" style={{ position: "relative" }}>
            <iframe
              className="location-section__map"
              title={t.title}
              src={`https://maps.google.com/maps?q=${buildMapQuery(location)}&z=14&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="location-section__map-lock location-section__map-lock--tr" aria-hidden="true" />
            <div className="location-section__map-lock location-section__map-lock--btm" aria-hidden="true" />
            <div
              className="location-section__approx-overlay"
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(100, 110, 120, 0.28)",
                border: "2px solid rgba(100, 110, 120, 0.45)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
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
