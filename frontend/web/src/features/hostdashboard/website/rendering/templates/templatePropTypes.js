import PropTypes from "prop-types";

const responsiveImageAssetPropType = PropTypes.shape({
  src: PropTypes.string.isRequired,
  thumbSrc: PropTypes.string,
  webSrc: PropTypes.string,
  originalSrc: PropTypes.string,
  srcSet: PropTypes.string,
  sizes: PropTypes.string,
});

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
  heroImageAsset: responsiveImageAssetPropType,
  residenceImage: PropTypes.string,
  residenceImageAsset: responsiveImageAssetPropType,
  galleryImages: PropTypes.arrayOf(PropTypes.string),
  galleryImageAssets: PropTypes.arrayOf(responsiveImageAssetPropType),
  imageRotation: PropTypes.shape({
    hero: PropTypes.bool,
    residence: PropTypes.bool,
    gallery: PropTypes.arrayOf(PropTypes.bool),
  }),
});

export const residenceSectionPropType = PropTypes.shape({
  title: PropTypes.string,
  headline: PropTypes.string,
  showPanel: PropTypes.bool,
  panelColor: PropTypes.string,
});

export const calendarSectionPropType = PropTypes.shape({
  title: PropTypes.string,
  description: PropTypes.string,
  showPanel: PropTypes.bool,
  panelColor: PropTypes.string,
});

export const galleryPropType = PropTypes.shape({
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
});

export const gallerySectionPropType = PropTypes.shape({
  title: PropTypes.string,
  description: PropTypes.string,
  browseLabel: PropTypes.string,
  showPanel: PropTypes.bool,
  panelColor: PropTypes.string,
});

export const availabilityPropType = PropTypes.shape({
  externalBlockedDates: PropTypes.arrayOf(PropTypes.string),
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  blockedDateCount: PropTypes.number,
  unavailableDateCount: PropTypes.number,
  syncSummary: PropTypes.string,
  externalBlockedSummary: PropTypes.string,
  unavailableDateSummary: PropTypes.string,
  blockedDateSummary: PropTypes.string,
  lastSyncLabel: PropTypes.string,
  nextBlockedLabel: PropTypes.string,
  callout: PropTypes.string,
});

export const callToActionPropType = PropTypes.shape({
  label: PropTypes.string.isRequired,
  note: PropTypes.string,
});

export const hostPropType = PropTypes.shape({
  name: PropTypes.string.isRequired,
  profileImage: PropTypes.string,
  initial: PropTypes.string,
  whatsapp: PropTypes.shape({
    connected: PropTypes.bool,
    displayName: PropTypes.string,
    phoneNumber: PropTypes.string,
    phoneNumberDigits: PropTypes.string,
    isAvailable: PropTypes.bool,
  }),
});

export const contactSectionPropType = PropTypes.shape({
  title: PropTypes.string.isRequired,
  caption: PropTypes.string,
  description: PropTypes.string,
  accentColor: PropTypes.string,
  backgroundColor: PropTypes.string,
  avatarMode: PropTypes.string,
  avatarImage: PropTypes.string,
});

export const copyItemPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  iconAmenityId: PropTypes.string,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
});

export const amenityPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  iconAmenityId: PropTypes.string,
  label: PropTypes.string.isRequired,
  category: PropTypes.string,
});

export const amenitiesSectionPropType = PropTypes.shape({
  title: PropTypes.string,
  description: PropTypes.string,
});

export const visibilityPropType = PropTypes.shape({
  topBar: PropTypes.bool,
  trustCards: PropTypes.bool,
  gallerySection: PropTypes.bool,
  amenitiesPanel: PropTypes.bool,
  availabilityCalendar: PropTypes.bool,
  callToAction: PropTypes.bool,
  journeyStops: PropTypes.bool,
  contactSection: PropTypes.bool,
  chatWidget: PropTypes.bool,
});

export const templateInteractionPropTypes = {
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
