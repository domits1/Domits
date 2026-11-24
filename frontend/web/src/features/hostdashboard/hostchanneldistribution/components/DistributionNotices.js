import React from "react";
import PropTypes from "prop-types";

// Shown instead of the OTA cards when the listing cannot turn on distribution yet (D3).
export function NotReadyNotice({ items }) {
  return (
    <div className="host-chdist__empty">
      <ul className="chdist-notice__list">
        {items.map((item) => (
          <li key={item} className="host-chdist__empty-text">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

NotReadyNotice.propTypes = {
  items: PropTypes.arrayOf(PropTypes.string).isRequired,
};
