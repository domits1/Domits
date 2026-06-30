import React from "react";
import PropTypes from "prop-types";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LanguageIcon from "@mui/icons-material/Language";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import SkeletonBlock from "./SkeletonBlock";

const HostSection = ({ host = {}, onContactHost, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="host-section" aria-busy="true">
        <div className="host-section__left">
          <div className="host-section__avatar-row">
            <SkeletonBlock width={64} height={64} borderRadius="50%" />
            <div className="host-section__identity">
              <SkeletonBlock width={190} height={20} />
              <SkeletonBlock width={120} height={14} />
            </div>
          </div>
          <SkeletonBlock width="92%" height={16} style={{ marginBottom: 10 }} />
          <SkeletonBlock width="70%" height={16} />
        </div>
        <div className="host-section__stats">
          <SkeletonBlock width={150} height={18} />
          <SkeletonBlock width={130} height={18} />
        </div>
      </div>
    );
  }

  const firstName = host.givenName || host.given_name || "";
  const lastName = host.familyName || host.family_name || "";
  const name = (firstName || lastName)
    ? `${firstName} ${lastName}`.trim()
    : host.name || "Host";
  const avatar = host.profileImage || null;
  const bio = host.bio || host.description || null;
  const isSuperhost = host.isSuperhost || host.superhost || false;
  const yearsHosting = host.yearsHosting || host.years_hosting || null;
  const responseTime = host.responseTime || host.response_time || null;
  const responseRate = host.responseRate || host.response_rate || null;
  const languages = host.languages || null;
  const location = host.location || host.city || null;

  return (
    <div className="host-section">
      <div className="host-section__left">
        <div className="host-section__avatar-row">
          {avatar ? (
            <img
              className="host-section__avatar"
              src={avatar}
              alt={`${name} avatar`}
            />
          ) : (
            <div className="host-section__avatar host-section__avatar--placeholder">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="host-section__identity">
            <h3 className="host-section__name">Hosted by {name}</h3>
            <div className="host-section__badges">
              {isSuperhost && (
                <span className="host-section__superhost-badge">Superhost</span>
              )}
              {yearsHosting && (
                <span className="host-section__years">· {yearsHosting} years hosting</span>
              )}
            </div>
          </div>
        </div>

        {bio && <p className="host-section__bio">{bio}</p>}

        {onContactHost && (
          <button
            type="button"
            className="host-section__contact-btn"
            onClick={onContactHost}
          >
            Contact host
          </button>
        )}
      </div>

      <div className="host-section__stats">
        {responseTime && (
          <div className="host-section__stat">
            <AccessTimeIcon fontSize="small" />
            <span>{responseTime}</span>
          </div>
        )}
        {responseRate && (
          <div className="host-section__stat">
            <CheckCircleOutlineIcon fontSize="small" />
            <span>{responseRate} response rate</span>
          </div>
        )}
        {languages && (
          <div className="host-section__stat">
            <LanguageIcon fontSize="small" />
            <span>Speaks {languages}</span>
          </div>
        )}
        {location && (
          <div className="host-section__stat">
            <LocationOnIcon fontSize="small" />
            <span>Lives in {location}</span>
          </div>
        )}
      </div>
    </div>
  );
};

HostSection.propTypes = {
  host: PropTypes.shape({
    givenName: PropTypes.string,
    name: PropTypes.string,
    profileImage: PropTypes.string,
    bio: PropTypes.string,
    description: PropTypes.string,
    isSuperhost: PropTypes.bool,
    superhost: PropTypes.bool,
    yearsHosting: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    years_hosting: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    responseTime: PropTypes.string,
    response_time: PropTypes.string,
    responseRate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    response_rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    languages: PropTypes.string,
    location: PropTypes.string,
    city: PropTypes.string,
  }),
  onContactHost: PropTypes.func,
  isLoading: PropTypes.bool,
};

export default HostSection;
