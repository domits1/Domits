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
    title: String(card?.title || ""),
    description: String(card?.description || ""),
  })),
  journeyStops: (Array.isArray(model?.journeyStops) ? model.journeyStops : []).map((stop) => ({
    title: String(stop?.title || ""),
    description: String(stop?.description || ""),
  })),
});

export const buildWebsiteDraftOverridePatch = (editorValues, baseModel) => {
  const nextPatch = {};
  const normalizedSiteTitle = cleanText(editorValues?.common?.siteTitle);
  const normalizedHeroEyebrow = cleanText(editorValues?.common?.heroEyebrow);
  const normalizedHeroTitle = cleanText(editorValues?.common?.heroTitle);
  const normalizedHeroDescription = cleanText(editorValues?.common?.heroDescription);
  const normalizedCtaLabel = cleanText(editorValues?.common?.ctaLabel);
  const normalizedCtaNote = cleanText(editorValues?.common?.ctaNote);

  if (normalizedSiteTitle && normalizedSiteTitle !== cleanText(baseModel?.site?.title)) {
    nextPatch.siteTitle = normalizedSiteTitle;
  }

  if (normalizedHeroEyebrow && normalizedHeroEyebrow !== cleanText(baseModel?.hero?.eyebrow)) {
    nextPatch.heroEyebrow = normalizedHeroEyebrow;
  }

  if (normalizedHeroTitle && normalizedHeroTitle !== cleanText(baseModel?.hero?.title)) {
    nextPatch.heroTitle = normalizedHeroTitle;
  }

  if (normalizedHeroDescription && normalizedHeroDescription !== cleanText(baseModel?.hero?.description)) {
    nextPatch.heroDescription = normalizedHeroDescription;
  }

  if (normalizedCtaLabel && normalizedCtaLabel !== cleanText(baseModel?.callToAction?.label)) {
    nextPatch.ctaLabel = normalizedCtaLabel;
  }

  if (normalizedCtaNote && normalizedCtaNote !== cleanText(baseModel?.callToAction?.note)) {
    nextPatch.ctaNote = normalizedCtaNote;
  }

  const nextVisibilityPatch = VISIBILITY_KEYS.reduce((visibilityPatch, visibilityKey) => {
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

  if (Object.keys(nextVisibilityPatch).length > 0) {
    nextPatch.visibility = nextVisibilityPatch;
  }

  const normalizedHeroImage = cleanText(editorValues?.images?.heroImage);
  if (normalizedHeroImage && normalizedHeroImage !== cleanText(baseModel?.media?.heroImage)) {
    nextPatch.heroImage = normalizedHeroImage;
  }

  const nextGalleryImagesPatch = (Array.isArray(baseModel?.gallery?.images) ? baseModel.gallery.images : []).map(
    (baseImage, index) => {
      const normalizedEditorImage = cleanText(editorValues?.images?.gallery?.[index]);
      return normalizedEditorImage && normalizedEditorImage !== cleanText(baseImage) ? normalizedEditorImage : "";
    }
  );

  if (nextGalleryImagesPatch.some(Boolean)) {
    nextPatch.galleryImages = nextGalleryImagesPatch;
  }

  const nextTrustCardsPatch = (Array.isArray(baseModel?.trustCards) ? baseModel.trustCards : []).map(
    (baseCard, index) => {
      const normalizedTitle = cleanText(editorValues?.trustCards?.[index]?.title);
      const normalizedDescription = cleanText(editorValues?.trustCards?.[index]?.description);
      const trustCardPatch = {};

      if (normalizedTitle && normalizedTitle !== cleanText(baseCard?.title)) {
        trustCardPatch.title = normalizedTitle;
      }

      if (normalizedDescription && normalizedDescription !== cleanText(baseCard?.description)) {
        trustCardPatch.description = normalizedDescription;
      }

      return trustCardPatch;
    }
  );

  if (nextTrustCardsPatch.some((cardPatch) => Object.keys(cardPatch).length > 0)) {
    nextPatch.trustCards = nextTrustCardsPatch;
  }

  const nextJourneyStopsPatch = (Array.isArray(baseModel?.journeyStops) ? baseModel.journeyStops : []).map(
    (baseStop, index) => {
      const normalizedTitle = cleanText(editorValues?.journeyStops?.[index]?.title);
      const normalizedDescription = cleanText(editorValues?.journeyStops?.[index]?.description);
      const journeyStopPatch = {};

      if (normalizedTitle && normalizedTitle !== cleanText(baseStop?.title)) {
        journeyStopPatch.title = normalizedTitle;
      }

      if (normalizedDescription && normalizedDescription !== cleanText(baseStop?.description)) {
        journeyStopPatch.description = normalizedDescription;
      }

      return journeyStopPatch;
    }
  );

  if (nextJourneyStopsPatch.some((stopPatch) => Object.keys(stopPatch).length > 0)) {
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

