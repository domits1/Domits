import { useEffect, useMemo, useState } from "react";

export const DEFAULT_WEBSITE_GALLERY_SLOT_COUNT = 6;

export const normalizeWebsiteImageRotationSettings = (
  imageRotation = {},
  gallerySlotCount = DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
) => {
  const normalizedGallerySlotCount = Math.max(0, Number(gallerySlotCount) || 0);
  const normalizedImageRotation =
    imageRotation && typeof imageRotation === "object" ? imageRotation : {};

  return {
    hero: Boolean(normalizedImageRotation.hero),
    residence: Boolean(normalizedImageRotation.residence),
    gallery: Array.from({ length: normalizedGallerySlotCount }, (_, index) =>
      Boolean(normalizedImageRotation.gallery?.[index])
    ),
  };
};

export const getWebsiteImageSlotRotationEnabled = (slot, imageRotation = {}) => {
  const normalizedImageRotation = normalizeWebsiteImageRotationSettings(imageRotation);

  if (slot?.kind === "hero") {
    return normalizedImageRotation.hero;
  }

  if (slot?.kind === "residence") {
    return normalizedImageRotation.residence;
  }

  const galleryIndex = Number.isInteger(slot?.index) ? slot.index : -1;
  if (galleryIndex < 0) {
    return false;
  }

  return Boolean(normalizedImageRotation.gallery[galleryIndex]);
};

export const setWebsiteImageSlotRotationEnabled = (
  imageRotation,
  slot,
  nextEnabled,
  gallerySlotCount = DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
) => {
  const normalizedImageRotation = normalizeWebsiteImageRotationSettings(imageRotation, gallerySlotCount);
  const normalizedNextEnabled = Boolean(nextEnabled);

  if (slot?.kind === "hero") {
    return {
      ...normalizedImageRotation,
      hero: normalizedNextEnabled,
    };
  }

  if (slot?.kind === "residence") {
    return {
      ...normalizedImageRotation,
      residence: normalizedNextEnabled,
    };
  }

  const galleryIndex = Number.isInteger(slot?.index) ? slot.index : -1;
  if (galleryIndex < 0) {
    return normalizedImageRotation;
  }

  const nextGalleryRotation = [...normalizedImageRotation.gallery];
  nextGalleryRotation[galleryIndex] = normalizedNextEnabled;

  return {
    ...normalizedImageRotation,
    gallery: nextGalleryRotation,
  };
};

export const resolveWebsiteImageSlotImageUrl = (slot, media = {}) => {
  const galleryImages = Array.isArray(media?.galleryImages) ? media.galleryImages : [];

  if (slot?.kind === "hero") {
    return String(media?.heroImage || galleryImages[0] || "").trim();
  }

  if (slot?.kind === "residence") {
    return String(media?.residenceImage || media?.heroImage || galleryImages[0] || "").trim();
  }

  const galleryIndex = Number.isInteger(slot?.index) ? slot.index : -1;
  if (galleryIndex < 0) {
    return "";
  }

  return String(galleryImages[galleryIndex] || media?.heroImage || galleryImages[0] || "").trim();
};

export const buildWebsiteImageSlotTarget = (slot) => {
  const slotSectionId = String(slot?.sectionId || "").trim();
  const slotTargetId = String(slot?.targetId || "").trim();

  if (slot?.kind === "hero") {
    return {
      sectionId: "images",
      targetId: "images.hero",
      imageSlot: { kind: "hero" },
    };
  }

  if (slot?.kind === "residence") {
    return {
      sectionId: "residence",
      targetId: "residence.image",
      imageSlot: { kind: "residence" },
    };
  }

  const galleryIndex = Number.isInteger(slot?.index) ? slot.index : 0;
  return {
    sectionId: slotSectionId || "images",
    targetId: slotTargetId || `images.gallery.${galleryIndex}`,
    imageSlot: { kind: "gallery", index: galleryIndex },
  };
};

export const buildWebsiteImageSlotSequence = (slot, media = {}) => {
  const galleryImages = Array.isArray(media?.galleryImages)
    ? media.galleryImages.map((imageUrl) => String(imageUrl || "").trim()).filter(Boolean)
    : [];
  const leadImageUrl = resolveWebsiteImageSlotImageUrl(slot, media);
  const heroImageUrl = String(media?.heroImage || "").trim();
  const imageSequence = [];
  const seenImageUrls = new Set();

  const appendImageUrl = (imageUrl) => {
    const normalizedImageUrl = String(imageUrl || "").trim();
    if (!normalizedImageUrl || seenImageUrls.has(normalizedImageUrl)) {
      return;
    }

    seenImageUrls.add(normalizedImageUrl);
    imageSequence.push(normalizedImageUrl);
  };

  appendImageUrl(leadImageUrl);
  galleryImages.forEach((imageUrl) => appendImageUrl(imageUrl));
  appendImageUrl(heroImageUrl);

  return imageSequence;
};

export const useWebsiteImageSlotRotation = (
  slot,
  media,
  rotationIntervalMs,
  imageSequenceOverride = undefined
) => {
  const slotKind = String(slot?.kind || "").trim();
  const slotIndex = Number.isInteger(slot?.index) ? slot.index : -1;
  const galleryImagesKey = JSON.stringify(
    Array.isArray(media?.galleryImages) ? media.galleryImages : []
  );
  const imageSequenceOverrideKey = JSON.stringify(
    Array.isArray(imageSequenceOverride) ? imageSequenceOverride : []
  );
  const imageRotationKey = JSON.stringify(
    normalizeWebsiteImageRotationSettings(
      media?.imageRotation,
      Array.isArray(media?.galleryImages) ? media.galleryImages.length : DEFAULT_WEBSITE_GALLERY_SLOT_COUNT
    )
  );
  const imageSequence = useMemo(
    () => {
      const normalizedSequenceOverride = Array.isArray(imageSequenceOverride)
        ? imageSequenceOverride.map((imageUrl) => String(imageUrl || "").trim()).filter(Boolean)
        : [];

      if (normalizedSequenceOverride.length > 0) {
        return normalizedSequenceOverride;
      }

      return buildWebsiteImageSlotSequence(slot, media);
    },
    [
      galleryImagesKey,
      imageSequenceOverrideKey,
      media?.heroImage,
      media?.residenceImage,
      slotIndex,
      slotKind,
    ]
  );
  const isRotationEnabled = useMemo(
    () => getWebsiteImageSlotRotationEnabled(slot, media?.imageRotation) && imageSequence.length > 1,
    [imageRotationKey, imageSequence.length, slotIndex, slotKind]
  );
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [imageSequence]);

  useEffect(() => {
    if (!isRotationEnabled) {
      return undefined;
    }

    const prefersReducedMotion =
      typeof globalThis.matchMedia === "function" &&
      globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    const intervalId = globalThis.setInterval(() => {
      setActiveImageIndex((currentIndex) => (currentIndex + 1) % imageSequence.length);
    }, rotationIntervalMs);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [imageSequence.length, isRotationEnabled, rotationIntervalMs]);

  return {
    activeImageIndex,
    imageSequence,
    isRotationEnabled,
  };
};
