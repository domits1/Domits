import {
  DEFAULT_WEBSITE_CONTACT_ACCENT_COLOR,
  DEFAULT_WEBSITE_CONTACT_BACKGROUND_COLOR,
  DEFAULT_WEBSITE_CONTACT_DESCRIPTION,
  DEFAULT_WEBSITE_CONTACT_TITLE,
  resolveWebsiteContactAccentColor,
  resolveWebsiteContactBackgroundColor,
} from "./websiteContactSectionConfig";
import {
  DEFAULT_WEBSITE_AMENITY_LABEL,
  MAX_FEATURED_WEBSITE_AMENITIES,
  MAX_WEBSITE_CONFIGURABLE_AMENITIES,
  WEBSITE_AMENITY_FALLBACK_CATEGORY,
} from "./websiteAmenitiesConfig";

const MANAGED_OVERRIDE_KEYS = Object.freeze([
  "siteTitle",
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "ctaLabel",
  "ctaNote",
  "contactTitle",
  "contactDescription",
  "contactAccentColor",
  "contactBackgroundColor",
  "contactAvatarImage",
  "contactButtonLabel",
  "visibility",
  "heroImage",
  "galleryImages",
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

  return `${safeItems.slice(0, -1).join(", ")}, and ${safeItems[safeItems.length - 1]}`;
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

const buildCountLabel = (imageCount) =>
  `${imageCount} imported photo${imageCount === 1 ? "" : "s"}`;

export const createEmptyWebsiteDraftEditorValues = () => ({
  common: {
    siteTitle: "",
    heroEyebrow: "",
    heroTitle: "",
    heroDescription: "",
    ctaLabel: "",
    ctaNote: "",
  },
  contact: {
    title: "",
    description: "",
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
    gallery: ["", "", ""],
  },
  amenities: [],
  trustCards: [],
  journeyStops: [],
});

export const applyWebsiteDraftContentOverrides = (model, overrides = {}) => {
  const siteTitle = cleanText(overrides.siteTitle);
  const heroEyebrow = cleanText(overrides.heroEyebrow);
  const heroTitle = cleanText(overrides.heroTitle);
  const heroDescription = cleanText(overrides.heroDescription);
  const ctaLabel = cleanText(overrides.ctaLabel);
  const ctaNote = cleanText(overrides.ctaNote);
  const contactTitle = cleanText(overrides.contactTitle);
  const contactDescription = cleanText(overrides.contactDescription);
  const contactAvatarImage = cleanText(overrides.contactAvatarImage);
  const contactAccentColorOverride = cleanText(overrides.contactAccentColor);
  const contactAccentColor = resolveWebsiteContactAccentColor(contactAccentColorOverride);
  const contactBackgroundColorOverride = cleanText(overrides.contactBackgroundColor);
  const contactBackgroundColor = resolveWebsiteContactBackgroundColor(contactBackgroundColorOverride);
  const heroImage = cleanText(overrides.heroImage);
  const mergedGalleryImages = mergeGalleryImages(model?.gallery?.images, overrides.galleryImages);
  const mergedAmenities = Array.isArray(overrides.amenities)
    ? normalizeAmenityItems(overrides.amenities)
    : getBaseAmenityItems(model);
  const mergedVisibility = mergeVisibility(model?.visibility, overrides.visibility);
  const mergedTrustCards = mergeCopyItems(model?.trustCards, overrides.trustCards);
  const mergedJourneyStops = mergeCopyItems(model?.journeyStops, overrides.journeyStops);

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
      galleryImages: mergeGalleryImages(model?.media?.galleryImages, overrides.galleryImages),
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
      featured: mergedAmenities.slice(0, MAX_FEATURED_WEBSITE_AMENITIES),
      all: mergedAmenities,
      summary: buildAmenitiesSummary(mergedAmenities),
    },
    callToAction: {
      ...model.callToAction,
      label: ctaLabel || model.callToAction.label,
      note: ctaNote || model.callToAction.note,
    },
    contactSection: {
      ...(model?.contactSection && typeof model.contactSection === "object" ? model.contactSection : {}),
      title: contactTitle || model?.contactSection?.title || DEFAULT_WEBSITE_CONTACT_TITLE,
      description:
        contactDescription ||
        model?.contactSection?.description ||
        DEFAULT_WEBSITE_CONTACT_DESCRIPTION,
      avatarImage: contactAvatarImage || model?.contactSection?.avatarImage || "",
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

export const buildWebsiteDraftEditorValues = (model) => ({
  common: {
    siteTitle: String(model?.site?.title || ""),
    heroEyebrow: String(model?.hero?.eyebrow || ""),
    heroTitle: String(model?.hero?.title || ""),
    heroDescription: String(model?.hero?.description || ""),
    ctaLabel: String(model?.callToAction?.label || ""),
    ctaNote: String(model?.callToAction?.note || ""),
  },
  contact: {
    title: String(model?.contactSection?.title || DEFAULT_WEBSITE_CONTACT_TITLE),
    description: String(model?.contactSection?.description || DEFAULT_WEBSITE_CONTACT_DESCRIPTION),
    avatarImage: String(model?.contactSection?.avatarImage || ""),
    accentColor: resolveWebsiteContactAccentColor(model?.contactSection?.accentColor),
    backgroundColor: resolveWebsiteContactBackgroundColor(model?.contactSection?.backgroundColor),
  },
  visibility: mergeVisibility({}, model?.visibility),
  images: {
    heroImage: String(model?.media?.heroImage || ""),
    gallery: Array.from({ length: 3 }, (_, index) => String(model?.gallery?.images?.[index] || "")),
  },
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
});

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
    patchKey: "contactTitle",
    editorValue: (editorValues) => editorValues?.contact?.title,
    baseValue: (baseModel) => baseModel?.contactSection?.title,
  },
  {
    patchKey: "contactDescription",
    editorValue: (editorValues) => editorValues?.contact?.description,
    baseValue: (baseModel) => baseModel?.contactSection?.description,
  },
  {
    patchKey: "contactAvatarImage",
    editorValue: (editorValues) => editorValues?.contact?.avatarImage,
    baseValue: (baseModel) => baseModel?.contactSection?.avatarImage,
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
]);

const addTextOverride = (patch, field, editorValues, baseModel) => {
  const normalizedEditorValue = cleanText(field.editorValue(editorValues));

  if (normalizedEditorValue && normalizedEditorValue !== cleanText(field.baseValue(baseModel))) {
    patch[field.patchKey] = normalizedEditorValue;
  }
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

  return JSON.stringify(normalizedEditorAmenities) !== JSON.stringify(normalizedBaseAmenities)
    ? normalizedEditorAmenities
    : null;
};

export const buildWebsiteDraftOverridePatch = (editorValues, baseModel) => {
  const nextPatch = {};
  TEXT_OVERRIDE_FIELDS.forEach((field) => addTextOverride(nextPatch, field, editorValues, baseModel));

  const nextVisibilityPatch = buildVisibilityPatch(editorValues, baseModel);
  if (Object.keys(nextVisibilityPatch).length > 0) {
    nextPatch.visibility = nextVisibilityPatch;
  }

  const nextGalleryImagesPatch = buildGalleryImagesPatch(editorValues, baseModel);
  if (nextGalleryImagesPatch.some(Boolean)) {
    nextPatch.galleryImages = nextGalleryImagesPatch;
  }

  const nextAmenitiesPatch = buildAmenitiesPatch(editorValues, baseModel);
  if (nextAmenitiesPatch !== null) {
    nextPatch.amenities = nextAmenitiesPatch;
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
