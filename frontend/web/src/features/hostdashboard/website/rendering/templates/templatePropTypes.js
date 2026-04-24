import PropTypes from "prop-types";

export const sitePropType = PropTypes.shape({
  title: PropTypes.string,
});

export const heroPropType = PropTypes.shape({
  eyebrow: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
});

export const mediaPropType = PropTypes.shape({
  heroImage: PropTypes.string,
});

export const galleryPropType = PropTypes.shape({
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
});

export const availabilityPropType = PropTypes.shape({
  externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  syncSummary: PropTypes.string,
  blockedDateSummary: PropTypes.string,
  lastSyncLabel: PropTypes.string,
  nextBlockedLabel: PropTypes.string,
  callout: PropTypes.string,
});

export const callToActionPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  note: PropTypes.string,
});

export const copyItemPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
});

export const amenityPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  category: PropTypes.string,
});

export const visibilityPropType = PropTypes.shape({
  topBar: PropTypes.bool,
  trustCards: PropTypes.bool,
  gallerySection: PropTypes.bool,
  amenitiesPanel: PropTypes.bool,
  availabilityCalendar: PropTypes.bool,
  callToAction: PropTypes.bool,
  journeyStops: PropTypes.bool,
  chatWidget: PropTypes.bool,
});

export const templateInteractionPropTypes = {
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
