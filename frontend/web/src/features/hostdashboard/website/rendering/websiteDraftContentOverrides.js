import {
  DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR,
  DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR,
  DEFAULT_WEBSITE_CONTACT_DESCRIPTION,
  DEFAULT_WEBSITE_CONTACT_SECTION_TITLE,
  DEFAULT_WEBSITE_CONTACT_TITLE,
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  resolveWebsiteContactAvatarMode,
  resolveWebsiteContactAccentColor,
  resolveWebsiteContactBackgroundColor,
  resolveWebsiteContactSectionCopy,
} from "../config/websiteContactSectionConfig";
import {
  DEFAULT_WEBSITE_AMENITY_LABEL,
  getDefaultWebsiteAmenityIconColor,
  MAX_FEATURED_WEBSITE_AMENITIES,
  MAX_WEBSITE_CONFIGURABLE_AMENITIES,
  resolveWebsiteAmenityIconColor,
  WEBSITE_AMENITY_FALLBACK_CATEGORY,
} from "../config/websiteAmenitiesConfig";
import {
  DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR,
  resolveWebsiteResidencePanelColor,
} from "../config/websiteResidenceSectionConfig";
import {
  getDefaultWebsiteCalendarDescription,
  getDefaultWebsiteCalendarTitle,
  getDefaultWebsiteCalendarPanelColor,
  normalizeWebsiteCalendarPanelColorOverride,
  resolveWebsiteCalendarPanelColor,
} from "../config/websiteCalendarSectionConfig";
import {
  getDefaultWebsiteGalleryPanelColor,
  normalizeWebsiteGalleryPanelColorOverride,
  resolveWebsiteGalleryPanelColor,
} from "../config/websiteGallerySectionConfig";
import {
  DEFAULT_WEBSITE_GALLERY_SLOT_COUNT,
  normalizeWebsiteImageRotationSettings,
} from "./websiteImageSlotUtils";

const MANAGED_OVERRIDE_KEYS = Object.freeze([
  "siteTitle",
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "ctaLabel",
  "ctaNote",
  "residenceHeadline",
  "residenceTitle",
  "residenceShowPanel",
  "residencePanelColor",
  "calendarShowPanel",
  "calendarPanelColor",
  "calendarTitle",
  "calendarDescription",
  "galleryTitle",
  "galleryDescription",
  "galleryBrowseLabel",
  "galleryShowPanel",
  "galleryPanelColor",
  "amenitiesTitle",
  "amenitiesDescription",
  "contactLabel",
  "contactTitle",
  "contactDescription",
  "contactAccentColor",
  "contactBackgroundColor",
  "contactAvatarMode",
  "contactAvatarImage",
  "contactButtonLabel",
  "visibility",
  "heroImage",
  "residenceImage",
  "galleryImages",
  "imageRotation",
  "amenitiesIconColor",
  "amenities",
  "trustCards",
  "journeyStops",
]);

const VISIBILITY_KEYS = Object.freeze([
  "topBar",
  "trustCards",
  "gallerySection",
  "amenitiesPanel",
  "availabilityCalendar",
  "callToAction",
  "journeyStops",
  "contactSection",
  "chatWidget",
]);

const cleanText = (value) => String(value || "").trim();

const getSectionConfig = (sectionConfig) =>
  sectionConfig && typeof sectionConfig === "object" ? sectionConfig : {};

const mergeVisibility = (baseVisibility = {}, overrideVisibility = {}) =>
  VISIBILITY_KEYS.reduce(
    (mergedVisibility, visibilityKey) => ({
      ...mergedVisibility,
      [visibilityKey]:
        typeof overrideVisibility[visibilityKey] === "boolean"
          ? overrideVisibility[visibilityKey]
          : Boolean(baseVisibility[visibilityKey]),
    }),
    {}
  );

const mergeCopyItems = (baseItems = [], overrideItems = []) =>
  baseItems.map((baseItem, index) => {
    const overrideItem = overrideItems[index] || {};
    const title = cleanText(overrideItem.title);
    const description = cleanText(overrideItem.description);
    const iconAmenityId = cleanText(overrideItem.iconAmenityId);

    return {
      ...baseItem,
      title: title || baseItem.title,
      description: description || baseItem.description,
      iconAmenityId: iconAmenityId || cleanText(baseItem.iconAmenityId),
    };
  });

const mergeGalleryImages = (baseImages = [], overrideImages = []) => {
  const normalizedBaseImages = Array.isArray(baseImages) ? baseImages : [];
  const normalizedOverrideImages = Array.isArray(overrideImages) ? overrideImages : [];

  return normalizedBaseImages.map((baseImage, index) => {
    const overrideImage = cleanText(normalizedOverrideImages[index]);
    return overrideImage || baseImage;
  });
};

const mergeImageRotationSettings = (
  baseImageRotation = {},
  overrideImageRotation = {},
  gallerySlotCount = DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
) => {
  const normalizedBaseImageRotation = normalizeWebsiteImageRotationSettings(
    baseImageRotation,
    gallerySlotCount
  );
  const normalizedOverrideImageRotation =
    overrideImageRotation && typeof overrideImageRotation === "object" ? overrideImageRotation : {};

  return {
    hero:
      typeof normalizedOverrideImageRotation.hero === "boolean"
        ? normalizedOverrideImageRotation.hero
        : normalizedBaseImageRotation.hero,
    residence:
      typeof normalizedOverrideImageRotation.residence === "boolean"
        ? normalizedOverrideImageRotation.residence
        : normalizedBaseImageRotation.residence,
    gallery: Array.from({ length: normalizedBaseImageRotation.gallery.length }, (_, index) =>
      typeof normalizedOverrideImageRotation.gallery?.[index] === "boolean"
        ? normalizedOverrideImageRotation.gallery[index]
        : normalizedBaseImageRotation.gallery[index]
    ),
  };
};

const joinListWithAnd = (items = []) => {
  const safeItems = items.filter(Boolean);
  if (safeItems.length < 1) {
    return "";
  }

  if (safeItems.length === 1) {
    return safeItems[0];
  }

  if (safeItems.length === 2) {
    return `${safeItems[0]} and ${safeItems[1]}`;
  }

  return `${safeItems.slice(0, -1).join(", ")}, and ${safeItems.at(-1)}`;
};

const resolveContactAvatarImageValue = (avatarMode, avatarImage) => {
  const normalizedAvatarImage = cleanText(avatarImage);
  const fallbackMode = normalizedAvatarImage
    ? WEBSITE_CONTACT_AVATAR_MODE_CUSTOM
    : WEBSITE_CONTACT_AVATAR_MODE_HOST;
  const normalizedAvatarMode = resolveWebsiteContactAvatarMode(avatarMode, fallbackMode);

  if (normalizedAvatarMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM) {
    return normalizedAvatarImage;
  }

  return "";
};

const normalizeAmenityItem = (amenity, index) => {
  const id = cleanText(amenity?.id) || `website-amenity-${index + 1}`;
  const label = cleanText(amenity?.label) || DEFAULT_WEBSITE_AMENITY_LABEL;
  const category = cleanText(amenity?.category) || WEBSITE_AMENITY_FALLBACK_CATEGORY;
  const iconAmenityId = cleanText(amenity?.iconAmenityId);

  return {
    id,
    label,
    category,
    ...(iconAmenityId ? { iconAmenityId } : {}),
  };
};

const normalizeAmenityItems = (amenities = []) =>
  (Array.isArray(amenities) ? amenities : [])
    .slice(0, MAX_WEBSITE_CONFIGURABLE_AMENITIES)
    .map((amenity, index) => normalizeAmenityItem(amenity, index));

const buildAmenitiesSummary = (amenities = []) =>
  joinListWithAnd(
    amenities
      .slice(0, 3)
      .map((amenity) => cleanText(amenity?.label).toLowerCase())
      .filter(Boolean)
  );

const getBaseAmenityItems = (model) => normalizeAmenityItems(model?.amenities?.all);

const buildAmenitiesSectionOverrides = ({
  model,
  amenitiesTitle,
  amenitiesDescription,
}) => ({
  ...getSectionConfig(model?.amenitiesSection),
  title: amenitiesTitle || model?.amenitiesSection?.title || "Amenities",
  description:
    amenitiesDescription || model?.amenitiesSection?.description || "Every Detail Considered",
});

const buildGallerySectionOverrides = ({
  model,
  galleryTitle,
  galleryDescription,
  galleryBrowseLabel,
  galleryShowPanelOverride,
  galleryPanelColorOverride,
  templateKey,
}) => ({
  ...getSectionConfig(model?.gallerySection),
  title: galleryTitle || model?.gallerySection?.title || "Gallery",
  description:
    galleryDescription ||
    model?.gallerySection?.description ||
    "A more editorial presentation of the property",
  browseLabel: galleryBrowseLabel || model?.gallerySection?.browseLabel || "Browse",
  showPanel:
    galleryShowPanelOverride === null
      ? model?.gallerySection?.showPanel !== false
      : galleryShowPanelOverride,
  panelColor: galleryPanelColorOverride
    ? normalizeWebsiteGalleryPanelColorOverride(galleryPanelColorOverride)
    : normalizeWebsiteGalleryPanelColorOverride(
        model?.gallerySection?.panelColor || getDefaultWebsiteGalleryPanelColor(templateKey)
      ),
});

const buildCountLabel = (imageCount) =>
  `${imageCount} imported photo${imageCount === 1 ? "" : "s"}`;

const buildResidenceSectionOverrides = ({
  model,
  residenceTitle,
  residenceHeadline,
  residenceShowPanelOverride,
  residencePanelColorOverride,
}) => ({
  ...getSectionConfig(model?.residenceSection),
  title: residenceTitle || model?.residenceSection?.title || "The residence",
  headline:
    residenceHeadline ||
    model?.residenceSection?.headline ||
    "Designed to present the stay with clarity and confidence",
  showPanel:
    residenceShowPanelOverride === null
      ? Boolean(model?.residenceSection?.showPanel)
      : residenceShowPanelOverride,
  panelColor: residencePanelColorOverride
    ? resolveWebsiteResidencePanelColor(residencePanelColorOverride)
    : resolveWebsiteResidencePanelColor(
        model?.residenceSection?.panelColor || DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR
      ),
});

const buildDefaultCalendarDescription = (model, templateKey = "") =>
  getDefaultWebsiteCalendarDescription({
    templateKey,
    propertyTitle: model?.site?.title,
    blockedDateCount: model?.availability?.blockedDateCount,
    availabilityCallout: model?.availability?.callout,
  });

const buildCalendarSectionOverrides = ({
  model,
  templateKey,
  calendarTitle,
  calendarDescription,
  calendarShowPanelOverride,
  calendarPanelColorOverride,
}) => ({
  ...getSectionConfig(model?.calendarSection),
  title:
    calendarTitle ||
    model?.calendarSection?.title ||
    getDefaultWebsiteCalendarTitle(templateKey),
  description:
    calendarDescription ||
    model?.calendarSection?.description ||
    buildDefaultCalendarDescription(model, templateKey),
  showPanel:
    calendarShowPanelOverride === null
      ? model?.calendarSection?.showPanel !== false
      : calendarShowPanelOverride,
  panelColor: calendarPanelColorOverride
    ? normalizeWebsiteCalendarPanelColorOverride(calendarPanelColorOverride)
    : normalizeWebsiteCalendarPanelColorOverride(model?.calendarSection?.panelColor),
});

export const createEmptyWebsiteDraftEditorValues = (templateKey = "") => ({
  common: {
    siteTitle: "",
    heroEyebrow: "",
    heroTitle: "",
    heroDescription: "",
    ctaLabel: "",
    ctaNote: "",
    residenceTitle: "",
    residenceHeadline: "",
    residenceShowPanel: false,
    residencePanelColor: DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR,
  },
  calendar: {
    title: getDefaultWebsiteCalendarTitle(templateKey),
    description: getDefaultWebsiteCalendarDescription({ templateKey }),
    showPanel: true,
    panelColor: getDefaultWebsiteCalendarPanelColor(templateKey),
  },
  gallerySection: {
    title: "Gallery",
    description: "A more editorial presentation of the property",
    browseLabel: "Browse",
    showPanel: true,
    panelColor: getDefaultWebsiteGalleryPanelColor(templateKey),
  },
  amenitiesSection: {
    title: "Amenities",
    description: "Every Detail Considered",
  },
  contact: {
    title: "",
    description: "",
    avatarMode: WEBSITE_CONTACT_AVATAR_MODE_HOST,
    avatarImage: "",
    accentColor: DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR,
    backgroundColor: DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR,
  },
  visibility: VISIBILITY_KEYS.reduce(
    (visibilityMap, visibilityKey) => ({
      ...visibilityMap,
      [visibilityKey]: true,
    }),
    {}
  ),
  images: {
    heroImage: "",
    residenceImage: "",
    gallery: ["", "", ""],
    rotation: normalizeWebsiteImageRotationSettings({}, DEFAULT_WEBSITE_GALLERY_SLOT_COUNT),
  },
  amenitiesIconColor: getDefaultWebsiteAmenityIconColor(templateKey),
  amenities: [],
  trustCards: [],
  journeyStops: [],
});

export const applyWebsiteDraftContentOverrides = (model, overrides = {}, templateKey = "") => {
  const siteTitle = cleanText(overrides.siteTitle);
  const heroEyebrow = cleanText(overrides.heroEyebrow);
  const heroTitle = cleanText(overrides.heroTitle);
  const heroDescription = cleanText(overrides.heroDescription);
  const ctaLabel = cleanText(overrides.ctaLabel);
  const ctaNote = cleanText(overrides.ctaNote);
  const residenceTitle = cleanText(overrides.residenceTitle);
  const residenceHeadline = cleanText(overrides.residenceHeadline);
  const residenceShowPanelOverride =
    typeof overrides.residenceShowPanel === "boolean" ? overrides.residenceShowPanel : null;
  const residencePanelColorOverride = cleanText(overrides.residencePanelColor);
  const calendarShowPanelOverride =
    typeof overrides.calendarShowPanel === "boolean" ? overrides.calendarShowPanel : null;
  const calendarPanelColorOverride = cleanText(overrides.calendarPanelColor);
  const calendarTitle = cleanText(overrides.calendarTitle);
  const calendarDescription = cleanText(overrides.calendarDescription);
  const galleryTitle = cleanText(overrides.galleryTitle);
  const galleryDescription = cleanText(overrides.galleryDescription);
  const galleryBrowseLabel = cleanText(overrides.galleryBrowseLabel);
  const galleryShowPanelOverride =
    typeof overrides.galleryShowPanel === "boolean" ? overrides.galleryShowPanel : null;
  const galleryPanelColorOverride = cleanText(overrides.galleryPanelColor);
  const amenitiesTitle = cleanText(overrides.amenitiesTitle);
  const amenitiesDescription = cleanText(overrides.amenitiesDescription);
  const contactTitle = cleanText(overrides.contactTitle);
  const contactLabel = cleanText(overrides.contactLabel);
  const contactDescription = cleanText(overrides.contactDescription);
  const contactAvatarModeOverride = cleanText(overrides.contactAvatarMode);
  const contactAvatarImage = cleanText(overrides.contactAvatarImage);
  const contactAccentColorOverride = cleanText(overrides.contactAccentColor);
  const contactAccentColor = resolveWebsiteContactAccentColor(contactAccentColorOverride);
  const contactBackgroundColorOverride = cleanText(overrides.contactBackgroundColor);
  const contactBackgroundColor = resolveWebsiteContactBackgroundColor(contactBackgroundColorOverride);
  const heroImage = cleanText(overrides.heroImage);
  const residenceImage = cleanText(overrides.residenceImage);
  const mergedImageRotation = mergeImageRotationSettings(
    model?.media?.imageRotation,
    overrides.imageRotation,
    DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
  );
  const amenitiesIconColorOverride = cleanText(overrides.amenitiesIconColor);
  const amenitiesIconColor = resolveWebsiteAmenityIconColor(
    amenitiesIconColorOverride || model?.amenities?.iconColor,
    templateKey
  );
  const mergedGalleryImages = mergeGalleryImages(model?.gallery?.images, overrides.galleryImages);
  const mergedAmenities = Array.isArray(overrides.amenities)
    ? normalizeAmenityItems(overrides.amenities)
    : getBaseAmenityItems(model);
  const mergedVisibility = mergeVisibility(model?.visibility, overrides.visibility);
  const mergedTrustCards = mergeCopyItems(model?.trustCards, overrides.trustCards);
  const mergedJourneyStops = mergeCopyItems(model?.journeyStops, overrides.journeyStops);
  const resolvedContactSectionCopy = resolveWebsiteContactSectionCopy(model?.contactSection);
  const modelContactAvatarImage = cleanText(model?.contactSection?.avatarImage);
  const modelContactAvatarMode = resolveWebsiteContactAvatarMode(
    model?.contactSection?.avatarMode,
    modelContactAvatarImage ? WEBSITE_CONTACT_AVATAR_MODE_CUSTOM : WEBSITE_CONTACT_AVATAR_MODE_HOST
  );
  let contactAvatarMode = modelContactAvatarMode;

  if (contactAvatarModeOverride) {
    contactAvatarMode = resolveWebsiteContactAvatarMode(contactAvatarModeOverride, modelContactAvatarMode);
  } else if (contactAvatarImage) {
    contactAvatarMode = WEBSITE_CONTACT_AVATAR_MODE_CUSTOM;
  }

  const resolvedContactAvatarImage =
    contactAvatarMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM
      ? contactAvatarImage || modelContactAvatarImage
      : "";

  return {
    ...model,
    site: {
      ...model.site,
      title: siteTitle || model.site.title,
      templateReadyTitle: siteTitle || model.site.templateReadyTitle,
    },
    hero: {
      ...model.hero,
      eyebrow: heroEyebrow || model.hero.eyebrow,
      title: heroTitle || model.hero.title,
      description: heroDescription || model.hero.description,
    },
    media: {
      ...model.media,
      heroImage: heroImage || model.media.heroImage,
      residenceImage: residenceImage || model?.media?.residenceImage || model?.media?.heroImage,
      galleryImages: mergeGalleryImages(model?.media?.galleryImages, overrides.galleryImages),
      imageRotation: mergedImageRotation,
      featuredGalleryImages: mergedGalleryImages,
      previewImages: mergedGalleryImages.slice(0, 3),
    },
    gallery: {
      ...model.gallery,
      images: mergedGalleryImages,
      countLabel: buildCountLabel(mergedGalleryImages.length),
    },
    amenities: {
      ...(model?.amenities && typeof model.amenities === "object" ? model.amenities : {}),
      iconColor: amenitiesIconColor,
      featured: mergedAmenities.slice(0, MAX_FEATURED_WEBSITE_AMENITIES),
      all: mergedAmenities,
      summary: buildAmenitiesSummary(mergedAmenities),
    },
    callToAction: {
      ...model.callToAction,
      label: ctaLabel || model.callToAction.label,
      note: ctaNote || model.callToAction.note,
    },
    residenceSection: buildResidenceSectionOverrides({
      model,
      residenceTitle,
      residenceHeadline,
      residenceShowPanelOverride,
      residencePanelColorOverride,
    }),
    calendarSection: buildCalendarSectionOverrides({
      model,
      templateKey,
      calendarTitle,
      calendarDescription,
      calendarShowPanelOverride,
      calendarPanelColorOverride,
    }),
    gallerySection: buildGallerySectionOverrides({
      model,
      galleryTitle,
      galleryDescription,
      galleryBrowseLabel,
      galleryShowPanelOverride,
      galleryPanelColorOverride,
      templateKey,
    }),
    amenitiesSection: buildAmenitiesSectionOverrides({
      model,
      amenitiesTitle,
      amenitiesDescription,
    }),
    contactSection: {
      ...(model?.contactSection && typeof model.contactSection === "object" ? model.contactSection : {}),
      title: contactLabel || resolvedContactSectionCopy.title || DEFAULT_WEBSITE_CONTACT_SECTION_TITLE,
      caption: contactTitle || resolvedContactSectionCopy.caption || DEFAULT_WEBSITE_CONTACT_TITLE,
      description:
        contactDescription ||
        model?.contactSection?.description ||
        DEFAULT_WEBSITE_CONTACT_DESCRIPTION,
      avatarMode: contactAvatarMode,
      avatarImage: resolvedContactAvatarImage,
      accentColor: contactAccentColorOverride
        ? contactAccentColor
        : model?.contactSection?.accentColor || DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR,
      backgroundColor: contactBackgroundColorOverride
        ? contactBackgroundColor
        : model?.contactSection?.backgroundColor || DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR,
    },
    trustCards: mergedTrustCards,
    journeyStops: mergedJourneyStops,
    visibility: mergedVisibility,
  };
};

export const buildWebsiteDraftEditorValues = (model, templateKey = "") => {
  const resolvedContactSectionCopy = resolveWebsiteContactSectionCopy(model?.contactSection);

  return {
    common: {
      siteTitle: String(model?.site?.title || ""),
      heroEyebrow: String(model?.hero?.eyebrow || ""),
      heroTitle: String(model?.hero?.title || ""),
      heroDescription: String(model?.hero?.description || ""),
      ctaLabel: String(model?.callToAction?.label || ""),
      ctaNote: String(model?.callToAction?.note || ""),
      residenceTitle: String(model?.residenceSection?.title || "The residence"),
      residenceHeadline: String(
        model?.residenceSection?.headline || "Designed to present the stay with clarity and confidence"
      ),
      residenceShowPanel: Boolean(model?.residenceSection?.showPanel),
      residencePanelColor: resolveWebsiteResidencePanelColor(
        model?.residenceSection?.panelColor || DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR
      ),
    },
    calendar: {
      title: String(
        model?.calendarSection?.title || getDefaultWebsiteCalendarTitle(templateKey)
      ),
      description: String(
        model?.calendarSection?.description ||
          getDefaultWebsiteCalendarDescription({
            templateKey,
            propertyTitle: model?.site?.title,
            blockedDateCount: model?.availability?.blockedDateCount,
            availabilityCallout: model?.availability?.callout,
          })
      ),
      showPanel: model?.calendarSection?.showPanel !== false,
      panelColor: resolveWebsiteCalendarPanelColor(
        model?.calendarSection?.panelColor,
        templateKey
      ),
    },
    gallerySection: {
      title: String(model?.gallerySection?.title || "Gallery"),
      description: String(
        model?.gallerySection?.description || "A more editorial presentation of the property"
      ),
      browseLabel: String(model?.gallerySection?.browseLabel || "Browse"),
      showPanel: model?.gallerySection?.showPanel !== false,
      panelColor: resolveWebsiteGalleryPanelColor(
        model?.gallerySection?.panelColor,
        templateKey
      ),
    },
    amenitiesSection: {
      title: String(model?.amenitiesSection?.title || "Amenities"),
      description: String(model?.amenitiesSection?.description || "Every Detail Considered"),
    },
    contact: {
      title: String(resolvedContactSectionCopy.title || DEFAULT_WEBSITE_CONTACT_SECTION_TITLE),
      caption: String(resolvedContactSectionCopy.caption || DEFAULT_WEBSITE_CONTACT_TITLE),
      description: String(model?.contactSection?.description || DEFAULT_WEBSITE_CONTACT_DESCRIPTION),
      avatarMode: resolveWebsiteContactAvatarMode(
        model?.contactSection?.avatarMode,
        cleanText(model?.contactSection?.avatarImage)
          ? WEBSITE_CONTACT_AVATAR_MODE_CUSTOM
          : WEBSITE_CONTACT_AVATAR_MODE_HOST
      ),
      avatarImage: String(model?.contactSection?.avatarImage || ""),
      accentColor: resolveWebsiteContactAccentColor(model?.contactSection?.accentColor),
      backgroundColor: resolveWebsiteContactBackgroundColor(model?.contactSection?.backgroundColor),
    },
    visibility: mergeVisibility({}, model?.visibility),
    images: {
      heroImage: String(model?.media?.heroImage || ""),
      residenceImage: String(model?.media?.residenceImage || model?.media?.heroImage || ""),
      gallery: Array.from(
        {
          length: Math.max(
            DEFAULT_WEBSITE_GALLERY_SLOT_COUNT,
            Array.isArray(model?.gallery?.images) ? model.gallery.images.length : 0
          ),
        },
        (_, index) => String(model?.gallery?.images?.[index] || "")
      ),
      rotation: normalizeWebsiteImageRotationSettings(
        model?.media?.imageRotation,
        DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
      ),
    },
    amenitiesIconColor: resolveWebsiteAmenityIconColor(model?.amenities?.iconColor, templateKey),
    amenities: getBaseAmenityItems(model).map((amenity) => ({
      id: String(amenity?.id || ""),
      iconAmenityId: String(amenity?.iconAmenityId || ""),
      label: String(amenity?.label || DEFAULT_WEBSITE_AMENITY_LABEL),
      category: String(amenity?.category || WEBSITE_AMENITY_FALLBACK_CATEGORY),
    })),
    trustCards: (Array.isArray(model?.trustCards) ? model.trustCards : []).map((card) => ({
      id: String(card?.id || card?.title || ""),
      iconAmenityId: String(card?.iconAmenityId || ""),
      title: String(card?.title || ""),
      description: String(card?.description || ""),
    })),
    journeyStops: (Array.isArray(model?.journeyStops) ? model.journeyStops : []).map((stop) => ({
      id: String(stop?.id || stop?.title || ""),
      title: String(stop?.title || ""),
      description: String(stop?.description || ""),
    })),
  };
};

const TEXT_OVERRIDE_FIELDS = Object.freeze([
  {
    patchKey: "siteTitle",
    editorValue: (editorValues) => editorValues?.common?.siteTitle,
    baseValue: (baseModel) => baseModel?.site?.title,
  },
  {
    patchKey: "heroEyebrow",
    editorValue: (editorValues) => editorValues?.common?.heroEyebrow,
    baseValue: (baseModel) => baseModel?.hero?.eyebrow,
  },
  {
    patchKey: "heroTitle",
    editorValue: (editorValues) => editorValues?.common?.heroTitle,
    baseValue: (baseModel) => baseModel?.hero?.title,
  },
  {
    patchKey: "heroDescription",
    editorValue: (editorValues) => editorValues?.common?.heroDescription,
    baseValue: (baseModel) => baseModel?.hero?.description,
  },
  {
    patchKey: "ctaLabel",
    editorValue: (editorValues) => editorValues?.common?.ctaLabel,
    baseValue: (baseModel) => baseModel?.callToAction?.label,
  },
  {
    patchKey: "ctaNote",
    editorValue: (editorValues) => editorValues?.common?.ctaNote,
    baseValue: (baseModel) => baseModel?.callToAction?.note,
  },
  {
    patchKey: "residenceTitle",
    editorValue: (editorValues) => editorValues?.common?.residenceTitle,
    baseValue: (baseModel) => baseModel?.residenceSection?.title,
  },
  {
    patchKey: "residenceHeadline",
    editorValue: (editorValues) => editorValues?.common?.residenceHeadline,
    baseValue: (baseModel) => baseModel?.residenceSection?.headline,
  },
  {
    patchKey: "residencePanelColor",
    editorValue: (editorValues) =>
      resolveWebsiteResidencePanelColor(editorValues?.common?.residencePanelColor),
    baseValue: (baseModel) =>
      resolveWebsiteResidencePanelColor(baseModel?.residenceSection?.panelColor),
  },
  {
    patchKey: "calendarPanelColor",
    editorValue: (editorValues, baseModel, templateKey) =>
      resolveWebsiteCalendarPanelColor(editorValues?.calendar?.panelColor, templateKey),
    baseValue: (baseModel, templateKey) =>
      resolveWebsiteCalendarPanelColor(baseModel?.calendarSection?.panelColor, templateKey),
  },
  {
    patchKey: "calendarTitle",
    editorValue: (editorValues) => editorValues?.calendar?.title,
    baseValue: (baseModel, templateKey) =>
      baseModel?.calendarSection?.title || getDefaultWebsiteCalendarTitle(templateKey),
  },
  {
    patchKey: "calendarDescription",
    editorValue: (editorValues) => editorValues?.calendar?.description,
    baseValue: (baseModel, templateKey) =>
      baseModel?.calendarSection?.description ||
      getDefaultWebsiteCalendarDescription({
        templateKey,
        propertyTitle: baseModel?.site?.title,
        blockedDateCount: baseModel?.availability?.blockedDateCount,
        availabilityCallout: baseModel?.availability?.callout,
      }),
  },
  {
    patchKey: "galleryTitle",
    editorValue: (editorValues) => editorValues?.gallerySection?.title,
    baseValue: (baseModel) => baseModel?.gallerySection?.title || "Gallery",
  },
  {
    patchKey: "galleryDescription",
    editorValue: (editorValues) => editorValues?.gallerySection?.description,
    baseValue: (baseModel) =>
      baseModel?.gallerySection?.description || "A more editorial presentation of the property",
  },
    {
      patchKey: "galleryBrowseLabel",
      editorValue: (editorValues) => editorValues?.gallerySection?.browseLabel,
      baseValue: (baseModel) => baseModel?.gallerySection?.browseLabel || "Browse",
    },
    {
      patchKey: "galleryPanelColor",
      editorValue: (editorValues, baseModel, templateKey) =>
        resolveWebsiteGalleryPanelColor(editorValues?.gallerySection?.panelColor, templateKey),
      baseValue: (baseModel, templateKey) =>
        resolveWebsiteGalleryPanelColor(baseModel?.gallerySection?.panelColor, templateKey),
    },
  {
    patchKey: "amenitiesTitle",
    editorValue: (editorValues) => editorValues?.amenitiesSection?.title,
    baseValue: (baseModel) => baseModel?.amenitiesSection?.title || "Amenities",
  },
  {
    patchKey: "amenitiesDescription",
    editorValue: (editorValues) => editorValues?.amenitiesSection?.description,
    baseValue: (baseModel) => baseModel?.amenitiesSection?.description || "Every Detail Considered",
  },
  {
    patchKey: "contactLabel",
    editorValue: (editorValues) => editorValues?.contact?.title,
    baseValue: (baseModel) => resolveWebsiteContactSectionCopy(baseModel?.contactSection).title,
  },
  {
    patchKey: "contactTitle",
    editorValue: (editorValues) => editorValues?.contact?.caption,
    baseValue: (baseModel) => resolveWebsiteContactSectionCopy(baseModel?.contactSection).caption,
  },
  {
    patchKey: "contactDescription",
    editorValue: (editorValues) => editorValues?.contact?.description,
    baseValue: (baseModel) => baseModel?.contactSection?.description,
  },
  {
    patchKey: "contactAvatarMode",
    editorValue: (editorValues, baseModel) =>
      resolveComparableContactAvatarMode({
        avatarMode: editorValues?.contact?.avatarMode,
        avatarImage: editorValues?.contact?.avatarImage,
        hasHostProfilePhoto: Boolean(cleanText(baseModel?.host?.profileImage)),
      }),
    baseValue: (baseModel) =>
      resolveComparableContactAvatarMode({
        avatarMode: baseModel?.contactSection?.avatarMode,
        avatarImage: baseModel?.contactSection?.avatarImage,
        hasHostProfilePhoto: Boolean(cleanText(baseModel?.host?.profileImage)),
      }),
  },
  {
    patchKey: "contactAvatarImage",
    editorValue: (editorValues) =>
      resolveContactAvatarImageValue(
        editorValues?.contact?.avatarMode,
        editorValues?.contact?.avatarImage
      ),
    baseValue: (baseModel) =>
      resolveContactAvatarImageValue(
        baseModel?.contactSection?.avatarMode,
        baseModel?.contactSection?.avatarImage
      ),
  },
  {
    patchKey: "contactAccentColor",
    editorValue: (editorValues) => resolveWebsiteContactAccentColor(editorValues?.contact?.accentColor),
    baseValue: (baseModel) => resolveWebsiteContactAccentColor(baseModel?.contactSection?.accentColor),
  },
  {
    patchKey: "contactBackgroundColor",
    editorValue: (editorValues) => resolveWebsiteContactBackgroundColor(editorValues?.contact?.backgroundColor),
    baseValue: (baseModel) => resolveWebsiteContactBackgroundColor(baseModel?.contactSection?.backgroundColor),
  },
  {
    patchKey: "heroImage",
    editorValue: (editorValues) => editorValues?.images?.heroImage,
    baseValue: (baseModel) => baseModel?.media?.heroImage,
  },
  {
    patchKey: "residenceImage",
    editorValue: (editorValues) => editorValues?.images?.residenceImage,
    baseValue: (baseModel) => baseModel?.media?.residenceImage,
  },
]);

const addTextOverride = (patch, field, editorValues, baseModel, templateKey) => {
  const normalizedEditorValue = cleanText(field.editorValue(editorValues, baseModel, templateKey));

  if (
    normalizedEditorValue &&
    normalizedEditorValue !== cleanText(field.baseValue(baseModel, templateKey))
  ) {
    patch[field.patchKey] = normalizedEditorValue;
  }
};

const BOOLEAN_OVERRIDE_FIELDS = Object.freeze([
  {
    patchKey: "residenceShowPanel",
    editorValue: (editorValues) => Boolean(editorValues?.common?.residenceShowPanel),
    baseValue: (baseModel) => Boolean(baseModel?.residenceSection?.showPanel),
  },
    {
      patchKey: "calendarShowPanel",
      editorValue: (editorValues) => editorValues?.calendar?.showPanel !== false,
      baseValue: (baseModel) => baseModel?.calendarSection?.showPanel !== false,
    },
    {
      patchKey: "galleryShowPanel",
      editorValue: (editorValues) => editorValues?.gallerySection?.showPanel !== false,
      baseValue: (baseModel) => baseModel?.gallerySection?.showPanel !== false,
    },
  ]);

const addBooleanOverride = (patch, field, editorValues, baseModel) => {
  const normalizedEditorValue = Boolean(field.editorValue(editorValues, baseModel));
  const normalizedBaseValue = Boolean(field.baseValue(baseModel));

  if (normalizedEditorValue !== normalizedBaseValue) {
    patch[field.patchKey] = normalizedEditorValue;
  }
};

const resolveComparableContactAvatarMode = ({
  avatarMode,
  avatarImage,
  hasHostProfilePhoto,
}) => {
  const normalizedAvatarMode = resolveWebsiteContactAvatarMode(
    avatarMode,
    cleanText(avatarImage) ? WEBSITE_CONTACT_AVATAR_MODE_CUSTOM : WEBSITE_CONTACT_AVATAR_MODE_HOST
  );

  if (normalizedAvatarMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM) {
    return WEBSITE_CONTACT_AVATAR_MODE_CUSTOM;
  }

  if (!hasHostProfilePhoto) {
    return WEBSITE_CONTACT_AVATAR_MODE_HOST;
  }

  return normalizedAvatarMode;
};

const buildVisibilityPatch = (editorValues, baseModel) =>
  VISIBILITY_KEYS.reduce((visibilityPatch, visibilityKey) => {
    const editorVisibilityValue = Boolean(editorValues?.visibility?.[visibilityKey]);
    const baseVisibilityValue = Boolean(baseModel?.visibility?.[visibilityKey]);

    if (editorVisibilityValue !== baseVisibilityValue) {
      return {
        ...visibilityPatch,
        [visibilityKey]: editorVisibilityValue,
      };
    }

    return visibilityPatch;
  }, {});

const buildGalleryImagesPatch = (editorValues, baseModel) =>
  (Array.isArray(baseModel?.gallery?.images) ? baseModel.gallery.images : []).map((baseImage, index) => {
    const normalizedEditorImage = cleanText(editorValues?.images?.gallery?.[index]);
    return normalizedEditorImage && normalizedEditorImage !== cleanText(baseImage) ? normalizedEditorImage : "";
  });

const buildImageRotationPatch = (editorValues, baseModel) => {
  const normalizedEditorImageRotation = normalizeWebsiteImageRotationSettings(
    editorValues?.images?.rotation,
    DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
  );
  const normalizedBaseImageRotation = normalizeWebsiteImageRotationSettings(
    baseModel?.media?.imageRotation,
    DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
  );

  if (JSON.stringify(normalizedEditorImageRotation) === JSON.stringify(normalizedBaseImageRotation)) {
    return null;
  }

  return normalizedEditorImageRotation;
};

const buildCopyCollectionPatch = (baseItems, editorItems) =>
  (Array.isArray(baseItems) ? baseItems : []).map((baseItem, index) => {
    const normalizedTitle = cleanText(editorItems?.[index]?.title);
    const normalizedDescription = cleanText(editorItems?.[index]?.description);
    const normalizedIconAmenityId = cleanText(editorItems?.[index]?.iconAmenityId);
    const itemPatch = {};

    if (normalizedTitle && normalizedTitle !== cleanText(baseItem?.title)) {
      itemPatch.title = normalizedTitle;
    }

    if (normalizedDescription && normalizedDescription !== cleanText(baseItem?.description)) {
      itemPatch.description = normalizedDescription;
    }

    if (normalizedIconAmenityId && normalizedIconAmenityId !== cleanText(baseItem?.iconAmenityId)) {
      itemPatch.iconAmenityId = normalizedIconAmenityId;
    }

    return itemPatch;
  });

const hasCollectionPatch = (patchItems) => patchItems.some((itemPatch) => Object.keys(itemPatch).length > 0);

const buildAmenitiesPatch = (editorValues, baseModel) => {
  const normalizedBaseAmenities = getBaseAmenityItems(baseModel);
  const normalizedEditorAmenities = normalizeAmenityItems(editorValues?.amenities);

  if (JSON.stringify(normalizedEditorAmenities) === JSON.stringify(normalizedBaseAmenities)) {
    return null;
  }

  return normalizedEditorAmenities;
};

const buildAmenitiesIconColorPatch = (editorValues, baseModel, templateKey = "") => {
  const normalizedEditorColor = resolveWebsiteAmenityIconColor(
    editorValues?.amenitiesIconColor,
    templateKey
  );
  const normalizedBaseColor = resolveWebsiteAmenityIconColor(
    baseModel?.amenities?.iconColor,
    templateKey
  );

  if (normalizedEditorColor === normalizedBaseColor) {
    return null;
  }

  return normalizedEditorColor;
};

export const buildWebsiteDraftOverridePatch = (editorValues, baseModel, templateKey = "") => {
  const nextPatch = {};
  TEXT_OVERRIDE_FIELDS.forEach((field) =>
    addTextOverride(nextPatch, field, editorValues, baseModel, templateKey)
  );
  BOOLEAN_OVERRIDE_FIELDS.forEach((field) =>
    addBooleanOverride(nextPatch, field, editorValues, baseModel)
  );

  const nextVisibilityPatch = buildVisibilityPatch(editorValues, baseModel);
  if (Object.keys(nextVisibilityPatch).length > 0) {
    nextPatch.visibility = nextVisibilityPatch;
  }

  const nextGalleryImagesPatch = buildGalleryImagesPatch(editorValues, baseModel);
  if (nextGalleryImagesPatch.some(Boolean)) {
    nextPatch.galleryImages = nextGalleryImagesPatch;
  }

  const nextImageRotationPatch = buildImageRotationPatch(editorValues, baseModel);
  if (nextImageRotationPatch) {
    nextPatch.imageRotation = nextImageRotationPatch;
  }

  const nextAmenitiesPatch = buildAmenitiesPatch(editorValues, baseModel);
  if (nextAmenitiesPatch !== null) {
    nextPatch.amenities = nextAmenitiesPatch;
  }

  const nextAmenitiesIconColorPatch = buildAmenitiesIconColorPatch(
    editorValues,
    baseModel,
    templateKey
  );
  if (nextAmenitiesIconColorPatch) {
    nextPatch.amenitiesIconColor = nextAmenitiesIconColorPatch;
  }

  const nextTrustCardsPatch = buildCopyCollectionPatch(baseModel?.trustCards, editorValues?.trustCards);
  if (hasCollectionPatch(nextTrustCardsPatch)) {
    nextPatch.trustCards = nextTrustCardsPatch;
  }

  const nextJourneyStopsPatch = buildCopyCollectionPatch(baseModel?.journeyStops, editorValues?.journeyStops);
  if (hasCollectionPatch(nextJourneyStopsPatch)) {
    nextPatch.journeyStops = nextJourneyStopsPatch;
  }

  return nextPatch;
};

export const mergeWebsiteDraftContentOverrides = (existingOverrides = {}, nextPatch = {}) => {
  const mergedOverrides = {
    ...existingOverrides,
  };

  MANAGED_OVERRIDE_KEYS.forEach((overrideKey) => {
    delete mergedOverrides[overrideKey];
  });

  return {
    ...mergedOverrides,
    ...nextPatch,
  };
};
