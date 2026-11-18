import React from "react";
import PropTypes from "prop-types";
import PanoramaPageLink from "../PanoramaPageLink";

export default function EliteAvailabilityLink({ href, label, isInteractivePreview, className }) {
  if (isInteractivePreview) {
    return <span className={className}>{label}</span>;
  }

  return (
    <PanoramaPageLink href={href} className={className}>
      {label}
    </PanoramaPageLink>
  );
}

EliteAvailabilityLink.propTypes = {
  href: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  isInteractivePreview: PropTypes.bool.isRequired,
  className: PropTypes.string.isRequired,
};
