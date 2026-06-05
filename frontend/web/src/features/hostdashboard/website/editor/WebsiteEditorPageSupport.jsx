import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { fetchWebsiteDraftByPropertyId } from "../services/websiteDraftService";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import { fetchWebsitePropertyDetails } from "../services/websitePropertyService";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import {
  applyWebsiteDraftContentOverrides,
  buildWebsiteDraftEditorValues,
  createEmptyWebsiteDraftEditorValues,
} from "../rendering/websiteDraftContentOverrides";
import {
  applyWebsiteDraftThemeOverrides,
  buildWebsiteDraftThemeEditorValues,
  createEmptyWebsiteDraftThemeEditorValues,
} from "../rendering/websiteDraftThemeOverrides";
import { WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE } from "../services/websitePreviewSync";
import { EDITOR_TARGET_KEYS } from "../websiteEditorConfig";
import { WebsiteEditorVisibilityToggleCard } from "./WebsiteEditorVisibilityToggleCard";
import {
  getDraftThemeOverrides,
  getDraftWorkingContentOverrides,
  normalizeUiErrorMessage,
} from "./websiteEditorUtils";

const PANORAMA_TEMPLATE_KEY = "panorama-landing";
const WEBSITE_EDITOR_SECTION_VISIBILITY_EXCLUSIONS = Object.freeze([
  "amenitiesPanel",
  "availabilityCalendar",
  "gallerySection",
]);

const getCleanText = (value) => String(value || "").trim();

const buildWebsiteDraftBootstrapValues = (draft) => {
  const templateKey = String(draft?.templateKey || "").trim();
  const contentOverrides = getDraftWorkingContentOverrides(draft);
  const bootstrapValues = createEmptyWebsiteDraftEditorValues(templateKey);
  const visibilityOverrides =
    contentOverrides?.visibility && typeof contentOverrides.visibility === "object"
      ? contentOverrides.visibility
      : {};
  const galleryImageOverrides = Array.isArray(contentOverrides?.galleryImages)
    ? contentOverrides.galleryImages
    : [];

  return {
    ...bootstrapValues,
    common: {
      ...bootstrapValues.common,
      siteTitle: getCleanText(contentOverrides.siteTitle),
      heroEyebrow: getCleanText(contentOverrides.heroEyebrow),
      heroTitle: getCleanText(contentOverrides.heroTitle),
      heroDescription: getCleanText(contentOverrides.heroDescription),
      ctaLabel: getCleanText(contentOverrides.ctaLabel),
      ctaNote: getCleanText(contentOverrides.ctaNote),
      residenceTitle: getCleanText(contentOverrides.residenceTitle) || bootstrapValues.common.residenceTitle,
      residenceHeadline:
        getCleanText(contentOverrides.residenceHeadline) || bootstrapValues.common.residenceHeadline,
      residenceShowPanel:
        typeof contentOverrides.residenceShowPanel === "boolean"
          ? contentOverrides.residenceShowPanel
          : bootstrapValues.common.residenceShowPanel,
      residencePanelColor:
        getCleanText(contentOverrides.residencePanelColor) || bootstrapValues.common.residencePanelColor,
    },
    calendar: {
      ...bootstrapValues.calendar,
      title: getCleanText(contentOverrides.calendarTitle) || bootstrapValues.calendar.title,
      description:
        getCleanText(contentOverrides.calendarDescription) || bootstrapValues.calendar.description,
      showPanel:
        typeof contentOverrides.calendarShowPanel === "boolean"
          ? contentOverrides.calendarShowPanel
          : bootstrapValues.calendar.showPanel,
      panelColor:
        getCleanText(contentOverrides.calendarPanelColor) || bootstrapValues.calendar.panelColor,
    },
    gallerySection: {
      ...bootstrapValues.gallerySection,
      title: getCleanText(contentOverrides.galleryTitle) || bootstrapValues.gallerySection.title,
      description:
        getCleanText(contentOverrides.galleryDescription) || bootstrapValues.gallerySection.description,
      browseLabel:
        getCleanText(contentOverrides.galleryBrowseLabel) || bootstrapValues.gallerySection.browseLabel,
      showPanel:
        typeof contentOverrides.galleryShowPanel === "boolean"
          ? contentOverrides.galleryShowPanel
          : bootstrapValues.gallerySection.showPanel,
      panelColor:
        getCleanText(contentOverrides.galleryPanelColor) || bootstrapValues.gallerySection.panelColor,
    },
    amenitiesSection: {
      ...bootstrapValues.amenitiesSection,
      title: getCleanText(contentOverrides.amenitiesTitle) || bootstrapValues.amenitiesSection.title,
      description:
        getCleanText(contentOverrides.amenitiesDescription) || bootstrapValues.amenitiesSection.description,
    },
    contact: {
      ...bootstrapValues.contact,
      title: getCleanText(contentOverrides.contactLabel) || bootstrapValues.contact.title,
      caption: getCleanText(contentOverrides.contactTitle) || bootstrapValues.contact.caption,
      description: getCleanText(contentOverrides.contactDescription) || bootstrapValues.contact.description,
      avatarMode: getCleanText(contentOverrides.contactAvatarMode) || bootstrapValues.contact.avatarMode,
      avatarImage: getCleanText(contentOverrides.contactAvatarImage),
      accentColor:
        getCleanText(contentOverrides.contactAccentColor) || bootstrapValues.contact.accentColor,
      backgroundColor:
        getCleanText(contentOverrides.contactBackgroundColor) || bootstrapValues.contact.backgroundColor,
    },
    visibility: {
      ...bootstrapValues.visibility,
      ...Object.fromEntries(
        Object.entries(visibilityOverrides).filter(([, visibilityValue]) => typeof visibilityValue === "boolean")
      ),
    },
    images: {
      ...bootstrapValues.images,
      heroImage: getCleanText(contentOverrides.heroImage),
      residenceImage: getCleanText(contentOverrides.residenceImage),
      gallery: bootstrapValues.images.gallery.map(
        (_, index) => getCleanText(galleryImageOverrides[index]) || ""
      ),
      rotation:
        contentOverrides.imageRotation && typeof contentOverrides.imageRotation === "object"
          ? contentOverrides.imageRotation
          : bootstrapValues.images.rotation,
    },
    amenitiesIconColor:
      getCleanText(contentOverrides.amenitiesIconColor) || bootstrapValues.amenitiesIconColor,
    amenities: Array.isArray(contentOverrides.amenities)
      ? contentOverrides.amenities
      : bootstrapValues.amenities,
    trustCards: Array.isArray(contentOverrides.trustCards)
      ? contentOverrides.trustCards
      : bootstrapValues.trustCards,
    journeyStops: Array.isArray(contentOverrides.journeyStops)
      ? contentOverrides.journeyStops
      : bootstrapValues.journeyStops,
  };
};

export const getCommonFieldPreviewTargetId = (fieldKey, templateKey = "") => {
  if (fieldKey === "residenceTitle") {
    return EDITOR_TARGET_KEYS.residence.title;
  }

  if (fieldKey === "residenceHeadline") {
    return EDITOR_TARGET_KEYS.residence.headline;
  }

  if (fieldKey === "heroDescription" && templateKey === PANORAMA_TEMPLATE_KEY) {
    return EDITOR_TARGET_KEYS.residence.description;
  }

  return EDITOR_TARGET_KEYS.common[fieldKey];
};

export function WebsiteEditorSectionVisibilityFieldCard({
  checked,
  field,
  handleVisibilityFieldChange,
  hasWhatsAppWidget,
  highlightedTargetId,
  setTargetRef,
}) {
  const visibilityTargetId = EDITOR_TARGET_KEYS.visibility(field.key);
  const inputId = `website-editor-visibility-${field.key}`;
  const labelId = `website-editor-visibility-${field.key}-label`;
  const descriptionId = `website-editor-visibility-${field.key}-description`;
  const isWhatsAppVisibilityField = field.key === "chatWidget";
  const isDisabled = isWhatsAppVisibilityField && !hasWhatsAppWidget;
  const fieldDescription = isDisabled ? (
    <a
      href="/hostdashboard/integrations-marketplace"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      Connect WhatsApp first to enable direct guest contact.
    </a>
  ) : (
    field.description
  );

  return (
    <WebsiteEditorVisibilityToggleCard
      targetRef={setTargetRef(visibilityTargetId)}
      field={{
        ...field,
        description: fieldDescription,
      }}
      inputId={inputId}
      labelId={labelId}
      descriptionId={descriptionId}
      checked={checked}
      onChange={isDisabled ? undefined : handleVisibilityFieldChange(field.key)}
      disabled={isDisabled}
      isHighlighted={highlightedTargetId === visibilityTargetId}
    />
  );
}

WebsiteEditorSectionVisibilityFieldCard.propTypes = {
  checked: PropTypes.bool.isRequired,
  field: PropTypes.shape({
    description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  handleVisibilityFieldChange: PropTypes.func.isRequired,
  hasWhatsAppWidget: PropTypes.bool.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  setTargetRef: PropTypes.func.isRequired,
};

export const buildWebsiteEditorSectionData = ({
  draftTemplateKey = "",
  imageSlots = [],
  visibilityFields = [],
} = {}) => {
  const normalizedVisibilityFields = Array.isArray(visibilityFields) ? visibilityFields : [];
  const normalizedImageSlots = Array.isArray(imageSlots) ? imageSlots : [];
  const isPanoramaTemplate = draftTemplateKey === PANORAMA_TEMPLATE_KEY;

  return {
    amenitiesVisibilityField:
      normalizedVisibilityFields.find((field) => field.key === "amenitiesPanel") || null,
    calendarVisibilityField:
      normalizedVisibilityFields.find((field) => field.key === "availabilityCalendar") || null,
    galleryVisibilityField:
      normalizedVisibilityFields.find((field) => field.key === "gallerySection") || null,
    standaloneVisibilityFields: normalizedVisibilityFields.filter(
      (field) => !WEBSITE_EDITOR_SECTION_VISIBILITY_EXCLUSIONS.includes(field.key)
    ),
    residenceImageSlot: normalizedImageSlots.find((slot) => slot.kind === "residence") || null,
    galleryImageSlots: isPanoramaTemplate
      ? normalizedImageSlots.filter((slot) => slot.kind === "gallery")
      : [],
    generalImageSlots: normalizedImageSlots.filter((slot) => {
      if (slot.kind === "residence") {
        return false;
      }

      if (isPanoramaTemplate && slot.kind === "gallery") {
        return false;
      }

      return true;
    }),
  };
};

export const useWebsiteEditorActionMenuDismiss = ({
  actionMenuRef,
  isActionMenuOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isActionMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    globalThis.document?.addEventListener("mousedown", handlePointerDown);
    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      globalThis.document?.removeEventListener("mousedown", handlePointerDown);
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenuRef, isActionMenuOpen, onClose]);
};

export const useWebsiteEditorOverlayLock = ({
  closeIconPicker,
  closeImagePicker,
  isIconPickerOpen,
  isImagePickerOpen,
}) => {
  useEffect(() => {
    const isOverlayOpen = isImagePickerOpen || isIconPickerOpen;
    if (!isOverlayOpen) {
      return undefined;
    }

    const documentBody = globalThis.document?.body;
    const previousOverflow = documentBody?.style.overflow ?? "";
    if (documentBody) {
      documentBody.style.overflow = "hidden";
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isIconPickerOpen) {
        closeIconPicker();
        return;
      }

      closeImagePicker();
    };

    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      if (documentBody) {
        documentBody.style.overflow = previousOverflow;
      }
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeIconPicker, closeImagePicker, isIconPickerOpen, isImagePickerOpen]);
};

export const useWebsiteEditorDataLoader = ({
  editorHydrationLockedRef,
  propertyId,
  setBaseModel,
  setDraftRecord,
  setEditorValues,
  setIsEditorLoading,
  setIsPreviewLoading,
  setLoadError,
  setPreviewLoadError,
  setSiteSummary,
  setSiteSummaryError,
  setThemeValues,
}) => {
  useEffect(() => {
    let isMounted = true;

    const loadEditorState = async () => {
      editorHydrationLockedRef.current = false;
      setIsEditorLoading(true);
      setIsPreviewLoading(true);
      setLoadError("");
      setPreviewLoadError("");
      setSiteSummaryError("");
      setBaseModel(null);

      try {
        const draft = await fetchWebsiteDraftByPropertyId(propertyId);

        if (!draft) {
          throw new Error("Website draft not found for this listing.");
        }

        if (!isMounted) {
          return;
        }

        setDraftRecord(draft);
        setEditorValues(buildWebsiteDraftBootstrapValues(draft));
        setThemeValues(buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(draft)));
        setIsEditorLoading(false);

        const siteSummaryPromise = fetchWebsiteSiteByPropertyId(propertyId)
          .then((nextSiteSummary) => {
            if (!isMounted) {
              return;
            }

            setSiteSummary(nextSiteSummary);
            setSiteSummaryError("");
          })
          .catch((siteError) => {
            if (!isMounted) {
              return;
            }

            setSiteSummary(null);
            setSiteSummaryError(
              normalizeUiErrorMessage(
                siteError?.message,
                "We could not load the live site status for this listing."
              )
            );
          });

        try {
          const propertyDetails = await fetchWebsitePropertyDetails(propertyId);

          if (!isMounted) {
            return;
          }

          const nextBaseModel = buildWebsiteTemplateModel({
            propertyDetails,
            summaryProperty: null,
          });
          const nextTemplateKey = String(draft.templateKey || "").trim();
          const nextThemedModel = applyWebsiteDraftThemeOverrides(
            nextBaseModel,
            getDraftThemeOverrides(draft)
          );
          const nextPreviewModel = applyWebsiteDraftContentOverrides(
            nextThemedModel,
            getDraftWorkingContentOverrides(draft),
            nextTemplateKey
          );

          setBaseModel(nextBaseModel);

          if (!editorHydrationLockedRef.current) {
            setEditorValues(buildWebsiteDraftEditorValues(nextPreviewModel, nextTemplateKey));
            setThemeValues(buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(draft)));
          }
        } catch (previewError) {
          if (!isMounted) {
            return;
          }

          setPreviewLoadError(
            normalizeUiErrorMessage(
              previewError?.message,
              "We could not load the property data required to render this website preview."
            )
          );
        } finally {
          if (isMounted) {
            setIsPreviewLoading(false);
          }
        }

        await siteSummaryPromise;
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDraftRecord(null);
        setBaseModel(null);
        setEditorValues(createEmptyWebsiteDraftEditorValues());
        setSiteSummary(null);
        setThemeValues(createEmptyWebsiteDraftThemeEditorValues());
        setLoadError(error?.message || "We could not open this website draft.");
        setIsEditorLoading(false);
        setIsPreviewLoading(false);
      }
    };

    loadEditorState();

    return () => {
      isMounted = false;
    };
  }, [
    editorHydrationLockedRef,
    propertyId,
    setBaseModel,
    setDraftRecord,
    setEditorValues,
    setIsEditorLoading,
    setIsPreviewLoading,
    setLoadError,
    setPreviewLoadError,
    setSiteSummary,
    setSiteSummaryError,
    setThemeValues,
  ]);
};

export const notifyOpenedLiveSiteWindow = ({
  nextSiteSummary,
  openedLiveSiteWindowOriginRef,
  openedLiveSiteWindowRef,
}) => {
  if (!openedLiveSiteWindowRef.current || openedLiveSiteWindowRef.current.closed) {
    openedLiveSiteWindowOriginRef.current = "";
    return;
  }

  const targetOrigin = String(openedLiveSiteWindowOriginRef.current || "").trim();
  if (!targetOrigin) {
    return;
  }

  openedLiveSiteWindowRef.current.postMessage(
    {
      type: WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE,
      siteId: nextSiteSummary?.site?.id || "",
      domain: nextSiteSummary?.primaryDomain?.domain || "",
      updatedAt: Date.now(),
    },
    targetOrigin
  );
};

export const buildNextEditorImageState = (currentValues, slot, nextValue) => {
  if (slot.kind === "hero") {
    return {
      ...currentValues,
      images: {
        ...currentValues.images,
        heroImage: nextValue,
      },
    };
  }

  if (slot.kind === "residence") {
    return {
      ...currentValues,
      images: {
        ...currentValues.images,
        residenceImage: nextValue,
      },
    };
  }

  const nextGalleryValues = [...currentValues.images.gallery];
  nextGalleryValues[slot.index] = nextValue;

  return {
    ...currentValues,
    images: {
      ...currentValues.images,
      gallery: nextGalleryValues,
    },
  };
};
