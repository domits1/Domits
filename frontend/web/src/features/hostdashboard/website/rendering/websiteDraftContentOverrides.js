const MANAGED_OVERRIDE_KEYS = Object.freeze([
  "siteTitle",
  "heroEyebrow",
  "heroTitle",
  "heroDescription",
  "ctaLabel",
  "ctaNote",
  "visibility",
  "heroImage",
  "galleryImages",
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

    return {
      ...baseItem,
      title: title || baseItem.title,
      description: description || baseItem.description,
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
  const heroImage = cleanText(overrides.heroImage);
  const mergedGalleryImages = mergeGalleryImages(model?.gallery?.images, overrides.galleryImages);
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
    callToAction: {
      ...model.callToAction,
      label: ctaLabel || model.callToAction.label,
      note: ctaNote || model.callToAction.note,
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
  visibility: mergeVisibility({}, model?.visibility),
  images: {
    heroImage: String(model?.media?.heroImage || ""),
    gallery: Array.from({ length: 3 }, (_, index) => String(model?.gallery?.images?.[index] || "")),
  },
  trustCards: (Array.isArray(model?.trustCards) ? model.trustCards : []).map((card) => ({
    id: String(card?.id || card?.title || ""),
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
    const itemPatch = {};

    if (normalizedTitle && normalizedTitle !== cleanText(baseItem?.title)) {
      itemPatch.title = normalizedTitle;
    }

    if (normalizedDescription && normalizedDescription !== cleanText(baseItem?.description)) {
      itemPatch.description = normalizedDescription;
    }

    return itemPatch;
  });

const hasCollectionPatch = (patchItems) => patchItems.some((itemPatch) => Object.keys(itemPatch).length > 0);

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

