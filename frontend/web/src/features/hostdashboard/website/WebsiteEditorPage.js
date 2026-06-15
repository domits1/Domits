import React, { useEffect, useMemo, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { upsertWebsiteDraft } from "./services/websiteDraftService";
import {
  fetchWebsiteSiteByPropertyId,
  publishWebsiteSite,
  unpublishWebsiteSite,
} from "./services/websiteSiteService";
import { getAmenityIconOptions } from "./rendering/amenityIconRegistry";
import WebsiteTemplatePreview from "./rendering/WebsiteTemplatePreview";
import {
  applyWebsiteDraftContentOverrides,
  buildWebsiteDraftOverridePatch,
  createEmptyWebsiteDraftEditorValues,
  mergeWebsiteDraftContentOverrides,
} from "./rendering/websiteDraftContentOverrides";
import {
  applyWebsiteDraftThemeOverrides,
  buildWebsiteDraftThemeEditorValues,
  buildWebsiteDraftThemeOverridePatch,
  createEmptyWebsiteDraftThemeEditorValues,
  isValidWebsiteBackgroundColor,
  mergeWebsiteDraftThemeOverrides,
  resolveWebsiteBackgroundColor,
} from "./rendering/websiteDraftThemeOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
import { announceWebsiteLiveSiteUpdate, announceWebsitePreviewUpdate } from "./services/websitePreviewSync";
import { buildPublishedWebsiteHref } from "./websitePublicSiteLinks";
import {
  EDITOR_SECTION_KEYS,
  EDITOR_TARGET_KEYS,
  PREVIEW_VIEWPORT_OPTIONS,
  TEMPLATE_COPY_COLLECTION_CONFIG,
  TEMPLATE_IMAGE_SLOT_MAP,
  TEMPLATE_VISIBILITY_FIELD_MAP,
  getAmenitiesTextFields,
  getCalendarTextFields,
  getCalendarToggleFields,
  getCommonTextFields,
  getContactSectionFields,
  getGalleryFieldPreviewTargetId,
  getGalleryToggleFields,
  getGalleryTextFields,
  getHeroAlignmentOptions,
  getResidenceTextFields,
  getResidenceToggleFields,
} from "./websiteEditorConfig";
import {
  resolveWebsiteContactAccentColor,
  resolveWebsiteContactBackgroundColor,
} from "./config/websiteContactSectionConfig";
import {
  resolveWebsiteResidencePanelColor,
} from "./config/websiteResidenceSectionConfig";
import {
  resolveWebsiteAmenityIconColor,
} from "./config/websiteAmenitiesConfig";
import {
  resolveWebsiteCalendarPanelColor,
} from "./config/websiteCalendarSectionConfig";
import {
  resolveWebsiteGalleryPanelColor,
} from "./config/websiteGallerySectionConfig";
import { WebsitePreviewSkeleton } from "./rendering/WebsitePreviewSkeleton";
import WebsiteIconPickerDialog from "./WebsiteIconPickerDialog";
import WebsiteImagePickerDialog from "./WebsiteImagePickerDialog";
import { WebsiteEditorSidebar } from "./editor/WebsiteEditorSidebar";
import {
  WebsiteEditorActionMenu,
  WebsiteEditorErrorState,
  WebsiteEditorLoadingState,
  WebsiteEditorPublicSitePanel,
} from "./editor/WebsiteEditorStates";
import { useWebsiteEditorTargeting } from "./editor/hooks/useWebsiteEditorTargeting";
import { useWebsiteEditorAssets } from "./editor/hooks/useWebsiteEditorAssets";
import { useWebsiteEditorCollections } from "./editor/hooks/useWebsiteEditorCollections";
import {
  buildWebsiteEditorSectionData,
  getCommonFieldPreviewTargetId,
  notifyOpenedLiveSiteWindow,
  useWebsiteEditorActionMenuDismiss,
  useWebsiteEditorDataLoader,
  useWebsiteEditorOverlayLock,
} from "./editor/WebsiteEditorPageSupport";
import {
  buildEditorValuesFromDraft,
  confirmDiscardDraftChanges,
  createCommitAndSaveOnEnterHandler,
  createEditorFieldKeyDownHandler,
  formatStatusLabel,
  forwardEditorBoundaryScroll,
  getDraftPublishedContentOverrides,
  getDraftPublishedThemeOverrides,
  getDraftThemeOverrides,
  getDraftWorkingContentOverrides,
  getLiveLinkStatus,
  getPrimaryWebsiteDomain,
  getPreviewTargetIdForVisibilityField,
  resolveWindowTargetOrigin,
  runAfterNextPaint,
} from "./editor/websiteEditorUtils";
import styles from "./WebsiteEditorPage.module.scss";

function WebsiteEditorPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [isEditorLoading, setIsEditorLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [previewLoadError, setPreviewLoadError] = useState("");
  const [draftRecord, setDraftRecord] = useState(null);
  const [baseModel, setBaseModel] = useState(null);
  const [editorValues, setEditorValues] = useState(createEmptyWebsiteDraftEditorValues);
  const [themeValues, setThemeValues] = useState(createEmptyWebsiteDraftThemeEditorValues);
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscardingChanges, setIsDiscardingChanges] = useState(false);
  const [isUpdatingLiveSite, setIsUpdatingLiveSite] = useState(false);
  const [isPublishingSite, setIsPublishingSite] = useState(false);
  const [isUnpublishingSite, setIsUnpublishingSite] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [siteSummary, setSiteSummary] = useState(null);
  const [siteSummaryError, setSiteSummaryError] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    [EDITOR_SECTION_KEYS.common]: false,
    [EDITOR_SECTION_KEYS.residence]: false,
    [EDITOR_SECTION_KEYS.calendar]: false,
    [EDITOR_SECTION_KEYS.gallery]: false,
    [EDITOR_SECTION_KEYS.contact]: false,
    [EDITOR_SECTION_KEYS.theme]: false,
    [EDITOR_SECTION_KEYS.visibility]: false,
    [EDITOR_SECTION_KEYS.images]: false,
    [EDITOR_SECTION_KEYS.trustCards]: false,
    [EDITOR_SECTION_KEYS.journeyStops]: false,
  });
  const [imagePickerState, setImagePickerState] = useState({
    isOpen: false,
    slot: null,
  });
  const actionMenuRef = useRef(null);
  const editorPanelRef = useRef(null);
  const editorHydrationLockedRef = useRef(false);
  const openedLiveSiteWindowRef = useRef(null);
  const openedLiveSiteWindowOriginRef = useRef("");
  const amenityIconOptions = useMemo(() => getAmenityIconOptions(), []);
  const openPreviewImagePicker = (slot) => {
    if (!slot) {
      return;
    }

    setImagePickerState({
      isOpen: true,
      slot,
    });
  };
  const markEditorInteracted = () => {
    editorHydrationLockedRef.current = true;
  };
  const draftTemplateKey = String(draftRecord?.templateKey || "").trim();
  const {
    activePreviewTargetId,
    activatePreviewTarget,
    clearActivePreviewTarget,
    flashPreviewTarget,
    focusEditorTarget,
    handlePreviewTargetSelect,
    highlightedTargetId,
    setPreviewTargetId,
    setSectionRef,
    setTargetRef,
    toggleSection,
  } = useWebsiteEditorTargeting({
    editorPanelRef,
    expandedSections,
    onSelectImageSlot: openPreviewImagePicker,
    setExpandedSections,
  });

  useWebsiteEditorDataLoader({
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
  });

  const draftTemplate = getWebsiteTemplateById(draftRecord?.templateKey);
  const commonTextFields = getCommonTextFields(draftRecord?.templateKey);
  const amenitiesTextFields = getAmenitiesTextFields(draftRecord?.templateKey);
  const calendarTextFields = getCalendarTextFields(draftRecord?.templateKey);
  const calendarToggleFields = getCalendarToggleFields(draftRecord?.templateKey);
  const galleryPanelToggleFields = getGalleryToggleFields(draftRecord?.templateKey);
  const galleryTextFields = getGalleryTextFields(draftRecord?.templateKey);
  const heroAlignmentOptions = getHeroAlignmentOptions(draftRecord?.templateKey);
  const residenceTextFields = getResidenceTextFields(draftRecord?.templateKey);
  const residenceToggleFields = getResidenceToggleFields(draftRecord?.templateKey);
  const contactSectionFields = getContactSectionFields(draftRecord?.templateKey);
  const hasResolvedPropertyDetails = Boolean(baseModel);
  const hasWhatsAppWidget = Boolean(baseModel?.host?.whatsapp?.isAvailable);
  const showWhatsAppSetupHint = hasResolvedPropertyDetails && !hasWhatsAppWidget;
  const {
    heroImageSlot,
    heroCallToActionVisibilityField,
    amenitiesVisibilityField,
    calendarVisibilityField,
    galleryVisibilityField,
    trustCardsVisibilityField,
    contactSectionVisibilityField,
    contactWidgetVisibilityField,
    standaloneVisibilityFields,
    residenceImageSlot,
    galleryImageSlots,
    generalImageSlots,
  } = useMemo(
    () => {
      const visibilityFields = TEMPLATE_VISIBILITY_FIELD_MAP[draftTemplateKey] || [];
      const imageSlots = TEMPLATE_IMAGE_SLOT_MAP[draftTemplateKey] || [];

      return buildWebsiteEditorSectionData({
        draftTemplateKey,
        imageSlots,
        visibilityFields,
      });
    },
    [draftTemplateKey]
  );
  const copyCollectionConfig = TEMPLATE_COPY_COLLECTION_CONFIG[draftRecord?.templateKey] || {};
  const residenceSectionTitle = String(editorValues?.common?.residenceTitle || "").trim() || "The residence";
  const importedImageOptions = useMemo(() => {
    const rawImageOptions = Array.isArray(baseModel?.media?.galleryImages) ? baseModel.media.galleryImages : [];
    return Array.from(new Set(rawImageOptions.map((imageUrl) => String(imageUrl || "").trim()).filter(Boolean)));
  }, [baseModel]);
  const {
    addAmenityItem,
    closeIconPicker,
    handleCollectionFieldChange,
    iconPickerState,
    moveAmenityItemDown,
    moveAmenityItemUp,
    openIconPicker,
    removeAmenityItem,
    selectIconFromPicker,
  } = useWebsiteEditorCollections({
    amenityIconOptions,
    editorValues,
    focusEditorTarget,
    setEditorValues,
    setPreviewTargetId,
  });
  const {
    closeImagePicker,
    handleContactImageFileChange,
    handleContactImageUseInitials,
    handleContactImageUseProfilePhoto,
    openImagePicker,
    selectImageFromPicker,
    updateImageSlotRotation,
  } = useWebsiteEditorAssets({
    imagePickerState,
    importedImageOptions,
    setEditorValues,
    setImagePickerState,
    setPreviewTargetId,
  });

  const contentOverridePatch = useMemo(() => {
    if (!baseModel) {
      return {};
    }

    return buildWebsiteDraftOverridePatch(editorValues, baseModel, draftTemplateKey);
  }, [baseModel, draftTemplateKey, editorValues]);

  const mergedContentOverrides = useMemo(
    () => mergeWebsiteDraftContentOverrides(getDraftWorkingContentOverrides(draftRecord), contentOverridePatch),
    [contentOverridePatch, draftRecord]
  );

  const publishedContentOverrides = useMemo(
    () => getDraftPublishedContentOverrides(draftRecord),
    [draftRecord]
  );
  const themeOverridePatch = useMemo(
    () => buildWebsiteDraftThemeOverridePatch(themeValues),
    [themeValues]
  );
  const mergedThemeOverrides = useMemo(
    () => mergeWebsiteDraftThemeOverrides(getDraftThemeOverrides(draftRecord), themeOverridePatch),
    [draftRecord, themeOverridePatch]
  );
  const publishedThemeOverrides = useMemo(
    () => getDraftPublishedThemeOverrides(draftRecord),
    [draftRecord]
  );

  const previewModel = useMemo(() => {
    if (!baseModel) {
      return null;
    }

    const themedModel = applyWebsiteDraftThemeOverrides(baseModel, mergedThemeOverrides);
    return applyWebsiteDraftContentOverrides(themedModel, mergedContentOverrides, draftTemplateKey);
  }, [baseModel, draftTemplateKey, mergedContentOverrides, mergedThemeOverrides]);

  const hasUnsavedChanges = useMemo(() => {
    const persistedOverrides = getDraftWorkingContentOverrides(draftRecord);
    const persistedThemeOverrides = getDraftThemeOverrides(draftRecord);
    return (
      JSON.stringify(mergedContentOverrides) !== JSON.stringify(persistedOverrides) ||
      JSON.stringify(mergedThemeOverrides) !== JSON.stringify(persistedThemeOverrides)
    );
  }, [draftRecord, mergedContentOverrides, mergedThemeOverrides]);

  const hasLiveSyncPending = useMemo(
    () =>
      JSON.stringify(mergedContentOverrides) !== JSON.stringify(publishedContentOverrides) ||
      JSON.stringify(mergedThemeOverrides) !== JSON.stringify(publishedThemeOverrides),
    [mergedContentOverrides, publishedContentOverrides, mergedThemeOverrides, publishedThemeOverrides]
  );

  const isMutatingDraft = isSaving || isDiscardingChanges || isUpdatingLiveSite;
  const isMutatingSite = isPublishingSite || isUnpublishingSite;
  const primarySiteDomain = useMemo(() => getPrimaryWebsiteDomain(siteSummary), [siteSummary]);
  const liveSiteStatusValue = siteSummary?.site?.status || "";
  const hasLiveSite = String(liveSiteStatusValue || "").trim().toUpperCase() === "PUBLISHED";
  const liveSiteStatus = formatStatusLabel(liveSiteStatusValue || "PREVIEW");
  const liveLinkStatus = getLiveLinkStatus({
    primarySiteDomain,
    hasLiveSite,
  });
  const canPublishSite =
    Boolean(draftRecord) &&
    !hasLiveSite &&
    !isMutatingDraft &&
    !isMutatingSite;
  const canUnpublishSite =
    Boolean(siteSummary?.site?.id) &&
    hasLiveSite &&
    !isMutatingDraft &&
    !isMutatingSite;

  useEffect(() => {
    setExpandedSections({
      [EDITOR_SECTION_KEYS.common]: false,
      [EDITOR_SECTION_KEYS.residence]: false,
      [EDITOR_SECTION_KEYS.calendar]: false,
      [EDITOR_SECTION_KEYS.gallery]: false,
      [EDITOR_SECTION_KEYS.amenities]: false,
      [EDITOR_SECTION_KEYS.contact]: false,
      [EDITOR_SECTION_KEYS.theme]: false,
      [EDITOR_SECTION_KEYS.visibility]: false,
      [EDITOR_SECTION_KEYS.images]: false,
      [EDITOR_SECTION_KEYS.trustCards]: false,
      [EDITOR_SECTION_KEYS.journeyStops]: false,
    });
  }, [draftRecord?.templateKey]);

  const handleCommonFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    const previewTargetId = getCommonFieldPreviewTargetId(fieldKey, draftTemplateKey);
    setPreviewTargetId(previewTargetId);
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        [fieldKey]: nextValue,
      },
    }));
  };

  const handleCalendarFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    const previewTargetId =
      fieldKey === "title" ? EDITOR_TARGET_KEYS.calendar.title : EDITOR_TARGET_KEYS.calendar.description;
    setPreviewTargetId(previewTargetId);
    setEditorValues((currentValues) => ({
      ...currentValues,
      calendar: {
        ...currentValues.calendar,
        [fieldKey]: nextValue,
      },
    }));
  };

  const handleCommonToggleFieldChange = (fieldKey) => (event) => {
    const nextChecked = Boolean(event.target.checked);
    const previewTargetId =
      fieldKey === "residenceShowPanel"
        ? EDITOR_TARGET_KEYS.residence.showPanel
        : EDITOR_TARGET_KEYS.common[fieldKey];
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        [fieldKey]: nextChecked,
      },
    }));
    clearActivePreviewTarget();
    runAfterNextPaint(() => {
      flashPreviewTarget(previewTargetId);
    });
  };

  const activateResidencePanelPreviewTarget = () => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.residence.showPanel);
  };

  const handleResidencePanelColorChange = (nextColor) => {
    activateResidencePanelPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        residencePanelColor: resolveWebsiteResidencePanelColor(nextColor),
      },
    }));
  };

  const handleResidencePanelColorInputChange = (nextInputValue) => {
    activateResidencePanelPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        residencePanelColor: nextInputValue,
      },
    }));
  };

  const commitResidencePanelColorInput = () => {
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        residencePanelColor: resolveWebsiteResidencePanelColor(currentValues?.common?.residencePanelColor),
      },
    }));
  };

  const handleResidencePanelColorInputKeyDown = createCommitAndSaveOnEnterHandler(
    commitResidencePanelColorInput,
    saveDraftChanges
  );

  const handleCalendarPanelToggleChange = (event) => {
    const nextChecked = Boolean(event.target.checked);
    setEditorValues((currentValues) => ({
      ...currentValues,
      calendar: {
        ...currentValues.calendar,
        showPanel: nextChecked,
      },
    }));
    clearActivePreviewTarget();
    runAfterNextPaint(() => {
      flashPreviewTarget(EDITOR_TARGET_KEYS.calendar.visibility);
    });
  };

  const activateCalendarPreviewTarget = () => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.calendar.visibility);
  };

  const handleCalendarPanelColorChange = (nextColor) => {
    activateCalendarPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      calendar: {
        ...currentValues.calendar,
        panelColor: resolveWebsiteCalendarPanelColor(nextColor, draftTemplateKey),
      },
    }));
  };

  const handleCalendarPanelColorInputChange = (nextInputValue) => {
    activateCalendarPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      calendar: {
        ...currentValues.calendar,
        panelColor: nextInputValue,
      },
    }));
  };

  const commitCalendarPanelColorInput = () => {
    setEditorValues((currentValues) => ({
      ...currentValues,
      calendar: {
        ...currentValues.calendar,
        panelColor: resolveWebsiteCalendarPanelColor(currentValues?.calendar?.panelColor, draftTemplateKey),
      },
    }));
  };

  const handleCalendarPanelColorInputKeyDown = createCommitAndSaveOnEnterHandler(
    commitCalendarPanelColorInput,
    saveDraftChanges
  );

  const handleContactFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    setPreviewTargetId(EDITOR_TARGET_KEYS.contact[fieldKey]);
    setEditorValues((currentValues) => ({
      ...currentValues,
      contact: {
        ...currentValues.contact,
        [fieldKey]: nextValue,
      },
    }));
  };

  const updateContactColorField = (fieldKey, resolveColor) => (nextValue) => {
    const resolvedColor = resolveColor(nextValue);
    setPreviewTargetId(EDITOR_TARGET_KEYS.contact[fieldKey]);
    setEditorValues((currentValues) => ({
      ...currentValues,
      contact: {
        ...currentValues.contact,
        [fieldKey]: resolvedColor,
      },
    }));
  };

  const updateContactColorInputField = (fieldKey) => (nextInputValue) => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.contact[fieldKey]);
    setEditorValues((currentValues) => ({
      ...currentValues,
      contact: {
        ...currentValues.contact,
        [fieldKey]: nextInputValue,
      },
    }));
  };

  const commitContactColorInput = (fieldKey, resolveColor) => {
    setEditorValues((currentValues) => ({
      ...currentValues,
      contact: {
        ...currentValues.contact,
        [fieldKey]: resolveColor(currentValues?.contact?.[fieldKey]),
      },
    }));
  };

  const createContactColorInputKeyDownHandler = (fieldKey, resolveColor) =>
    createCommitAndSaveOnEnterHandler(
      () => {
        commitContactColorInput(fieldKey, resolveColor);
      },
      saveDraftChanges
    );

  const handleContactAccentColorChange = (accentColor) => {
    updateContactColorField("accentColor", resolveWebsiteContactAccentColor)(accentColor);
  };

  const handleContactAccentColorInputChange = (nextInputValue) => {
    updateContactColorInputField("accentColor")(nextInputValue);
  };

  const commitContactAccentColorInput = () => {
    commitContactColorInput("accentColor", resolveWebsiteContactAccentColor);
  };

  const handleContactAccentColorInputKeyDown = createContactColorInputKeyDownHandler(
    "accentColor",
    resolveWebsiteContactAccentColor
  );

  const handleContactBackgroundColorChange = (backgroundColor) => {
    updateContactColorField("backgroundColor", resolveWebsiteContactBackgroundColor)(backgroundColor);
  };

  const handleContactBackgroundColorInputChange = (nextInputValue) => {
    updateContactColorInputField("backgroundColor")(nextInputValue);
  };

  const commitContactBackgroundColorInput = () => {
    commitContactColorInput("backgroundColor", resolveWebsiteContactBackgroundColor);
  };

  const handleContactBackgroundColorInputKeyDown = createContactColorInputKeyDownHandler(
    "backgroundColor",
    resolveWebsiteContactBackgroundColor
  );

  const activateAmenitiesPreviewTarget = () => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.visibility("amenitiesPanel"));
  };

  const handleAmenitiesIconColorChange = (nextColor) => {
    activateAmenitiesPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenitiesIconColor: resolveWebsiteAmenityIconColor(nextColor, draftTemplateKey),
    }));
  };

  const handleAmenitiesIconColorInputChange = (nextInputValue) => {
    activateAmenitiesPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenitiesIconColor: nextInputValue,
    }));
  };

  const commitAmenitiesIconColorInput = () => {
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenitiesIconColor: resolveWebsiteAmenityIconColor(
        currentValues?.amenitiesIconColor,
        draftTemplateKey
      ),
    }));
  };

  const handleAmenitiesIconColorInputKeyDown = createCommitAndSaveOnEnterHandler(
    commitAmenitiesIconColorInput,
    saveDraftChanges
  );

  const handleThemeBackgroundColorChange = (backgroundColor) => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.common.siteTitle);
    const resolvedBackgroundColor = resolveWebsiteBackgroundColor(backgroundColor);
    setThemeValues((currentValues) => ({
      ...currentValues,
      backgroundColor: resolvedBackgroundColor,
      backgroundColorInput: resolvedBackgroundColor,
    }));
  };

  const commitThemeBackgroundColorInput = () => {
    setThemeValues((currentValues) => {
      const hasValidCustomColor = isValidWebsiteBackgroundColor(currentValues.backgroundColorInput);
      const nextBackgroundColor = hasValidCustomColor
        ? resolveWebsiteBackgroundColor(currentValues.backgroundColorInput)
        : currentValues.backgroundColor;

      return {
        ...currentValues,
        backgroundColor: nextBackgroundColor,
        backgroundColorInput: nextBackgroundColor,
      };
    });
  };

  const handleThemeBackgroundColorInputChange = (nextInputValue) => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.common.siteTitle);
    setThemeValues((currentValues) => {
      const hasValidCustomColor = isValidWebsiteBackgroundColor(nextInputValue);
      const nextBackgroundColor = hasValidCustomColor
        ? resolveWebsiteBackgroundColor(nextInputValue)
        : currentValues.backgroundColor;

      return {
        ...currentValues,
        backgroundColor: nextBackgroundColor,
        backgroundColorInput: nextInputValue,
      };
    });
  };

  const handleVisibilityFieldChange = (fieldKey) => (event) => {
    const nextChecked = event.target.checked;
    const previewTargetId = getPreviewTargetIdForVisibilityField(fieldKey);
    setEditorValues((currentValues) => ({
      ...currentValues,
      visibility: {
        ...currentValues.visibility,
        [fieldKey]: nextChecked,
      },
    }));
    clearActivePreviewTarget();
    runAfterNextPaint(() => {
      flashPreviewTarget(previewTargetId);
    });
  };

  const handleAmenitiesSectionFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    const previewTargetId =
      fieldKey === "title"
        ? EDITOR_TARGET_KEYS.amenitiesSection.title
        : EDITOR_TARGET_KEYS.amenitiesSection.description;
    setPreviewTargetId(previewTargetId);
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenitiesSection: {
        ...currentValues.amenitiesSection,
        [fieldKey]: nextValue,
      },
    }));
  };

  const handleGallerySectionFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    const previewTargetId = getGalleryFieldPreviewTargetId(fieldKey);
    setPreviewTargetId(previewTargetId);
    setEditorValues((currentValues) => ({
      ...currentValues,
      gallerySection: {
        ...currentValues.gallerySection,
        [fieldKey]: nextValue,
      },
    }));
  };

  const handleGalleryPanelToggleChange = (event) => {
    const nextChecked = Boolean(event.target.checked);
    setEditorValues((currentValues) => ({
      ...currentValues,
      gallerySection: {
        ...currentValues.gallerySection,
        showPanel: nextChecked,
      },
    }));
    clearActivePreviewTarget();
    runAfterNextPaint(() => {
      flashPreviewTarget(EDITOR_TARGET_KEYS.gallery.visibility);
    });
  };

  const activateGalleryPreviewTarget = () => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.gallery.visibility);
  };

  const handleGalleryPanelColorChange = (nextColor) => {
    activateGalleryPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      gallerySection: {
        ...currentValues.gallerySection,
        panelColor: resolveWebsiteGalleryPanelColor(nextColor, draftTemplateKey),
      },
    }));
  };

  const handleGalleryPanelColorInputChange = (nextInputValue) => {
    activateGalleryPreviewTarget();
    setEditorValues((currentValues) => ({
      ...currentValues,
      gallerySection: {
        ...currentValues.gallerySection,
        panelColor: nextInputValue,
      },
    }));
  };

  const commitGalleryPanelColorInput = () => {
    setEditorValues((currentValues) => ({
      ...currentValues,
      gallerySection: {
        ...currentValues.gallerySection,
        panelColor: resolveWebsiteGalleryPanelColor(
          currentValues?.gallerySection?.panelColor,
          draftTemplateKey
        ),
      },
    }));
  };

  const handleGalleryPanelColorInputKeyDown = createCommitAndSaveOnEnterHandler(
    commitGalleryPanelColorInput,
    saveDraftChanges
  );

  const recoverPublishedSiteSummary = async () => {
    const normalizedPropertyId = String(draftRecord?.propertyId || "").trim();
    if (!normalizedPropertyId) {
      return null;
    }

    for (const retryDelayMs of [0, 250, 750]) {
      if (retryDelayMs > 0) {
        await new Promise((resolve) => {
          globalThis.setTimeout(resolve, retryDelayMs);
        });
      }

      try {
        const nextSiteSummary = await fetchWebsiteSiteByPropertyId(normalizedPropertyId);
        if (String(nextSiteSummary?.site?.status || "").trim().toUpperCase() !== "PUBLISHED") {
          continue;
        }

        setSiteSummary(nextSiteSummary);
        setSiteSummaryError("");
        announceWebsiteLiveSiteUpdate({
          siteId: nextSiteSummary?.site?.id,
          domain: nextSiteSummary?.primaryDomain?.domain,
        });
        notifyOpenedLiveSiteWindow({
          nextSiteSummary,
          openedLiveSiteWindowOriginRef,
          openedLiveSiteWindowRef,
        });
        return nextSiteSummary;
      } catch {
        // Keep retrying briefly so the editor can reflect a completed publish without a hard refresh.
      }
    }

    return null;
  };

  const hydratePersistedDraftRecord = (persistedDraft) => {
    if (!persistedDraft) {
      throw new Error("Draft update completed, but no website draft was returned.");
    }

    const nextTemplateKey = String(persistedDraft.templateKey || draftTemplateKey).trim();

    setDraftRecord(persistedDraft);
    if (baseModel) {
      setEditorValues(buildEditorValuesFromDraft(baseModel, persistedDraft, nextTemplateKey));
    }
    setThemeValues(buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(persistedDraft)));

    return persistedDraft;
  };

  const persistDraftState = async ({ syncPublishedState = false } = {}) => {
    if (!draftRecord) {
      throw new Error("Website draft not found.");
    }

    const persistedDraft = await upsertWebsiteDraft({
      propertyId: draftRecord.propertyId,
      templateKey: draftRecord.templateKey,
      status: draftRecord.status || "DRAFT",
      contentOverrides: mergedContentOverrides,
      themeOverrides: mergedThemeOverrides,
      publishedContentOverrides: syncPublishedState ? mergedContentOverrides : publishedContentOverrides,
      publishedThemeOverrides: syncPublishedState ? mergedThemeOverrides : publishedThemeOverrides,
    });
    const nextDraft = hydratePersistedDraftRecord(persistedDraft);

    announceWebsitePreviewUpdate(nextDraft?.id || draftRecord.id);

    return nextDraft;
  };

  async function saveDraftChanges() {
    if (!draftRecord || !hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);

    try {
      await persistDraftState();
      toast.success("Draft changes saved.");
    } catch (error) {
      toast.error(error?.message || "We could not save your website changes.");
    } finally {
      setIsSaving(false);
    }
  }

  const discardDraftChanges = async () => {
    if (!draftRecord || !hasLiveSyncPending || isMutatingDraft) {
      return;
    }

    setIsActionMenuOpen(false);
    const discardWasCancelled = confirmDiscardDraftChanges() === false;
    if (discardWasCancelled) {
      return;
    }

    setIsDiscardingChanges(true);

    try {
      const persistedDraft = await upsertWebsiteDraft({
        propertyId: draftRecord.propertyId,
        templateKey: draftRecord.templateKey,
        status: draftRecord.status || "DRAFT",
        contentOverrides: publishedContentOverrides,
        themeOverrides: publishedThemeOverrides,
      });
      hydratePersistedDraftRecord(persistedDraft);
      toast.success("Draft reverted to the current published version.");
    } catch (error) {
      toast.error(error?.message || "We could not discard your draft changes.");
    } finally {
      setIsDiscardingChanges(false);
    }
  };

  const updateLiveSiteChanges = async () => {
    if (!draftRecord || !hasLiveSite || !hasLiveSyncPending || isMutatingDraft || isMutatingSite) {
      return;
    }

    setIsActionMenuOpen(false);
    setIsUpdatingLiveSite(true);

    try {
      await persistDraftState({ syncPublishedState: true });
      const nextSiteSummary = await publishWebsiteSite(draftRecord.propertyId);
      setSiteSummary(nextSiteSummary);
      setSiteSummaryError("");
      announceWebsiteLiveSiteUpdate({
        siteId: nextSiteSummary?.site?.id,
        domain: nextSiteSummary?.primaryDomain?.domain,
      });
      notifyOpenedLiveSiteWindow({
        nextSiteSummary,
        openedLiveSiteWindowOriginRef,
        openedLiveSiteWindowRef,
      });
      toast.success("Live site updated.");
    } catch (error) {
      const errorMessage = error?.message || "We could not update the live site.";
      setSiteSummaryError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUpdatingLiveSite(false);
    }
  };

  const publishLiveSite = async () => {
    if (!draftRecord || !canPublishSite) {
      return;
    }

    setIsActionMenuOpen(false);
    setIsPublishingSite(true);

    try {
      await persistDraftState({ syncPublishedState: true });
      const nextSiteSummary = await publishWebsiteSite(draftRecord.propertyId);
      setSiteSummary(nextSiteSummary);
      setSiteSummaryError("");
      announceWebsiteLiveSiteUpdate({
        siteId: nextSiteSummary?.site?.id,
        domain: nextSiteSummary?.primaryDomain?.domain,
      });
      notifyOpenedLiveSiteWindow({
        nextSiteSummary,
        openedLiveSiteWindowOriginRef,
        openedLiveSiteWindowRef,
      });
      toast.success("Live site published.");
    } catch (error) {
      const recoveredSiteSummary = await recoverPublishedSiteSummary();
      if (recoveredSiteSummary) {
        toast.success("Live site published.");
        return;
      }

      const errorMessage = error?.message || "We could not publish the live site.";
      setSiteSummaryError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsPublishingSite(false);
    }
  };

  const unpublishLiveSite = async () => {
    if (!draftRecord || !canUnpublishSite) {
      return;
    }

    setIsActionMenuOpen(false);
    setIsUnpublishingSite(true);

    try {
      const nextSiteSummary = await unpublishWebsiteSite(draftRecord.propertyId);
      setSiteSummary(nextSiteSummary);
      setSiteSummaryError("");
      announceWebsiteLiveSiteUpdate({
        siteId: nextSiteSummary?.site?.id,
        domain: nextSiteSummary?.primaryDomain?.domain,
      });
      notifyOpenedLiveSiteWindow({
        nextSiteSummary,
        openedLiveSiteWindowOriginRef,
        openedLiveSiteWindowRef,
      });
      toast.success("Live site unpublished.");
    } catch (error) {
      const errorMessage = error?.message || "We could not unpublish the live site.";
      setSiteSummaryError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUnpublishingSite(false);
    }
  };

  const handleEditorFieldKeyDown = (field) => createEditorFieldKeyDownHandler(field, saveDraftChanges);

  const handleThemeBackgroundColorInputKeyDown = createCommitAndSaveOnEnterHandler(
    commitThemeBackgroundColorInput,
    saveDraftChanges
  );

  const openLiveWebsiteLink = () => {
    const publishedWebsiteHref = buildPublishedWebsiteHref(
      primarySiteDomain?.domain,
      siteSummary?.site?.id,
      primarySiteDomain?.status,
      siteSummary?.site?.siteName
    );
    if (!publishedWebsiteHref) {
      toast.error("This website does not have a live link yet.");
      return;
    }

    setIsActionMenuOpen(false);
    const openedLiveSiteWindow = globalThis.open(publishedWebsiteHref, "_blank", "noopener,noreferrer");

    openedLiveSiteWindowRef.current = openedLiveSiteWindow;
    openedLiveSiteWindowOriginRef.current = openedLiveSiteWindow
      ? resolveWindowTargetOrigin(publishedWebsiteHref)
      : "";
  };

  const toggleActionMenu = () => {
    setIsActionMenuOpen((currentValue) => !currentValue);
  };

  useWebsiteEditorActionMenuDismiss({
    actionMenuRef,
    isActionMenuOpen,
    onClose: () => {
      setIsActionMenuOpen(false);
    },
  });

  useWebsiteEditorOverlayLock({
    closeIconPicker,
    closeImagePicker,
    isIconPickerOpen: iconPickerState.isOpen,
    isImagePickerOpen: imagePickerState.isOpen,
  });

  const renderLoadingSection = ({ id, title, description }) => (
    <section key={id} className={styles.panelSection}>
      <div className={styles.loadingSectionHeader}>
        <h3 className={styles.sectionBlockTitle}>{title}</h3>
        <p className={styles.sectionBlockDescription}>{description}</p>
      </div>
      <div className={styles.loadingSectionBody}>
        <PulseBarsLoader message={`Loading ${title.toLowerCase()}...`} />
      </div>
    </section>
  );

  if (isEditorLoading) {
    return (
      <WebsiteEditorLoadingState
        renderLoadingSection={renderLoadingSection}
        editorPanelRef={editorPanelRef}
        onEditorPanelWheel={forwardEditorBoundaryScroll}
      />
    );
  }

  if (loadError || !draftRecord) {
    return <WebsiteEditorErrorState loadError={loadError} navigate={navigate} />;
  }
  const previewHeadingTitle =
    previewModel?.site?.title || editorValues.common.siteTitle || draftTemplate?.name || "Website preview";
  const hasPreviewRenderError = Boolean(previewLoadError || !baseModel || !previewModel);
  let previewPanelContent = <WebsitePreviewSkeleton viewport={previewViewport} />;

  if (!isPreviewLoading) {
    previewPanelContent = hasPreviewRenderError ? (
      <p className={styles.errorText}>
        {previewLoadError || "We could not render the website preview right now."}
      </p>
    ) : (
      <WebsiteTemplatePreview
        templateId={draftRecord.templateKey}
        model={previewModel}
        viewport={previewViewport}
        onSelectTarget={handlePreviewTargetSelect}
        activeTargetId={activePreviewTargetId}
      />
    );
  }

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.editorPage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Direct booking website editor</p>

            <div className={styles.heroHeader}>
              <div>
                <h1 className={styles.heroTitle}>{previewHeadingTitle}</h1>
                <p className={styles.heroDescription}>
                  Manage the saved website, refine its content and presentation, and publish updates to
                  the Domits live link.
                </p>
              </div>
            </div>

            <div className={`${styles.buttonRow} ${styles.heroActionRow}`.trim()}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate("/hostdashboard/website")}
              >
                <ArrowBackIcon fontSize="small" />
                Back to website workspace
              </button>
              <WebsiteEditorActionMenu
                actionMenuRef={actionMenuRef}
                isActionMenuOpen={isActionMenuOpen}
                toggleActionMenu={toggleActionMenu}
                hasLiveSite={hasLiveSite}
                primarySiteDomain={primarySiteDomain}
                openLiveWebsiteLink={openLiveWebsiteLink}
                updateLiveSiteChanges={updateLiveSiteChanges}
                isMutatingDraft={isMutatingDraft}
                hasLiveSyncPending={hasLiveSyncPending}
                isUpdatingLiveSite={isUpdatingLiveSite}
                publishLiveSite={publishLiveSite}
                canPublishSite={canPublishSite}
                isPublishingSite={isPublishingSite}
                unpublishLiveSite={unpublishLiveSite}
                canUnpublishSite={canUnpublishSite}
                isUnpublishingSite={isUnpublishingSite}
                discardDraftChanges={discardDraftChanges}
                isDiscardingChanges={isDiscardingChanges}
              />
            </div>

            <WebsiteEditorPublicSitePanel
              siteSummary={siteSummary}
              primarySiteDomain={primarySiteDomain}
              liveSiteStatus={liveSiteStatus}
              liveLinkStatus={liveLinkStatus}
              siteSummaryError={siteSummaryError}
              hasLiveSite={hasLiveSite}
              hasLiveSyncPending={hasLiveSyncPending}
              draftId={draftRecord?.id || ""}
            />
          </div>

          <div className={styles.surface}>
            <WebsiteEditorSidebar
              activatePreviewTarget={activatePreviewTarget}
              addAmenityItem={addAmenityItem}
              amenitiesConfig={copyCollectionConfig.amenities}
              amenitiesTextFields={amenitiesTextFields}
              amenitiesVisibilityField={amenitiesVisibilityField}
              calendarTextFields={calendarTextFields}
              calendarToggleFields={calendarToggleFields}
              calendarVisibilityField={calendarVisibilityField}
              clearActivePreviewTarget={clearActivePreviewTarget}
              commitAmenitiesIconColorInput={commitAmenitiesIconColorInput}
              commitCalendarPanelColorInput={commitCalendarPanelColorInput}
              commitContactAccentColorInput={commitContactAccentColorInput}
              commitContactBackgroundColorInput={commitContactBackgroundColorInput}
              commitGalleryPanelColorInput={commitGalleryPanelColorInput}
              commitResidencePanelColorInput={commitResidencePanelColorInput}
              commitThemeBackgroundColorInput={commitThemeBackgroundColorInput}
              commonTextFields={commonTextFields}
              contactSectionFields={contactSectionFields}
              trustCardsVisibilityField={trustCardsVisibilityField}
              contactSectionVisibilityField={contactSectionVisibilityField}
              contactWidgetVisibilityField={contactWidgetVisibilityField}
              copyCollectionConfig={copyCollectionConfig}
              draftTemplateKey={draftTemplateKey}
              editorPanelRef={editorPanelRef}
              editorValues={editorValues}
              expandedSections={expandedSections}
              forwardEditorBoundaryScroll={forwardEditorBoundaryScroll}
              galleryImageSlots={galleryImageSlots}
              galleryPanelToggleFields={galleryPanelToggleFields}
              galleryTextFields={galleryTextFields}
              galleryVisibilityField={galleryVisibilityField}
              generalImageSlots={generalImageSlots}
              heroAlignmentOptions={heroAlignmentOptions}
              heroCallToActionVisibilityField={heroCallToActionVisibilityField}
              heroImageSlot={heroImageSlot}
              handleAmenitiesIconColorChange={handleAmenitiesIconColorChange}
              handleAmenitiesIconColorInputChange={handleAmenitiesIconColorInputChange}
              handleAmenitiesIconColorInputKeyDown={handleAmenitiesIconColorInputKeyDown}
              handleAmenitiesSectionFieldChange={handleAmenitiesSectionFieldChange}
              handleCalendarFieldChange={handleCalendarFieldChange}
              handleCalendarPanelColorChange={handleCalendarPanelColorChange}
              handleCalendarPanelColorInputChange={handleCalendarPanelColorInputChange}
              handleCalendarPanelColorInputKeyDown={handleCalendarPanelColorInputKeyDown}
              handleCalendarPanelToggleChange={handleCalendarPanelToggleChange}
              handleCollectionFieldChange={handleCollectionFieldChange}
              handleCommonFieldChange={handleCommonFieldChange}
              handleCommonToggleFieldChange={handleCommonToggleFieldChange}
              handleContactAccentColorChange={handleContactAccentColorChange}
              handleContactAccentColorInputChange={handleContactAccentColorInputChange}
              handleContactAccentColorInputKeyDown={handleContactAccentColorInputKeyDown}
              handleContactBackgroundColorChange={handleContactBackgroundColorChange}
              handleContactBackgroundColorInputChange={handleContactBackgroundColorInputChange}
              handleContactBackgroundColorInputKeyDown={handleContactBackgroundColorInputKeyDown}
              handleContactFieldChange={handleContactFieldChange}
              handleContactImageFileChange={handleContactImageFileChange}
              handleContactImageUseInitials={handleContactImageUseInitials}
              handleContactImageUseProfilePhoto={handleContactImageUseProfilePhoto}
              handleEditorFieldKeyDown={handleEditorFieldKeyDown}
              handleGalleryPanelColorChange={handleGalleryPanelColorChange}
              handleGalleryPanelColorInputChange={handleGalleryPanelColorInputChange}
              handleGalleryPanelColorInputKeyDown={handleGalleryPanelColorInputKeyDown}
              handleGalleryPanelToggleChange={handleGalleryPanelToggleChange}
              handleGallerySectionFieldChange={handleGallerySectionFieldChange}
              handleResidencePanelColorChange={handleResidencePanelColorChange}
              handleResidencePanelColorInputChange={handleResidencePanelColorInputChange}
              handleResidencePanelColorInputKeyDown={handleResidencePanelColorInputKeyDown}
              handleThemeBackgroundColorChange={handleThemeBackgroundColorChange}
              handleThemeBackgroundColorInputChange={handleThemeBackgroundColorInputChange}
              handleThemeBackgroundColorInputKeyDown={handleThemeBackgroundColorInputKeyDown}
              handleVisibilityFieldChange={handleVisibilityFieldChange}
              hasUnsavedChanges={hasUnsavedChanges}
              hasWhatsAppWidget={hasWhatsAppWidget}
              highlightedTargetId={highlightedTargetId}
              importedImageOptions={importedImageOptions}
              isEditorReady={!isEditorLoading}
              isMutatingDraft={isMutatingDraft}
              isSaving={isSaving}
              markEditorInteracted={markEditorInteracted}
              moveAmenityItemDown={moveAmenityItemDown}
              moveAmenityItemUp={moveAmenityItemUp}
              onChangeImageRotation={updateImageSlotRotation}
              onOpenIconPicker={openIconPicker}
              onOpenImagePicker={openImagePicker}
              previewModel={previewModel}
              removeAmenityItem={removeAmenityItem}
              residenceImageSlot={residenceImageSlot}
              residenceSectionTitle={residenceSectionTitle}
              residenceTextFields={residenceTextFields}
              residenceToggleFields={residenceToggleFields}
              saveDraftChanges={saveDraftChanges}
              setSectionRef={setSectionRef}
              setTargetRef={setTargetRef}
              showWhatsAppSetupHint={showWhatsAppSetupHint}
              standaloneVisibilityFields={standaloneVisibilityFields}
              themeValues={themeValues}
              toggleSection={toggleSection}
            />

            <section className={styles.previewPanel}>
              <div className={`${styles.panelHeader} ${styles.previewPanelHeader}`.trim()}>
                <div className={styles.previewPanelHeaderCopy}>
                  <div className={styles.previewPanelTitleRow}>
                    <h2 className={styles.panelTitle}>Website preview</h2>
                    <span className={styles.metaPill}>{draftTemplate?.name || "Template"}</span>
                    <span className={styles.metaPill}>{draftRecord.status || "DRAFT"}</span>
                  </div>
                </div>
                <div className={styles.previewViewportControls} role="tablist" aria-label="Preview viewport">
                  {PREVIEW_VIEWPORT_OPTIONS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={previewViewport === id}
                      className={`${styles.previewViewportButton} ${
                        previewViewport === id ? styles.previewViewportButtonActive : ""
                      }`.trim()}
                      onClick={() => setPreviewViewport(id)}
                    >
                      <Icon fontSize="small" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {previewPanelContent}
            </section>
          </div>
        </section>
      </div>

      <WebsiteImagePickerDialog
        editorValues={editorValues}
        imagePickerState={imagePickerState}
        importedImageOptions={importedImageOptions}
        onClose={closeImagePicker}
        onSelectImage={selectImageFromPicker}
      />

      <WebsiteIconPickerDialog
        isOpen={iconPickerState.isOpen}
        label={iconPickerState.label}
        amenityIconOptions={amenityIconOptions}
        selectedAmenityId={
          editorValues?.[iconPickerState.collectionKey]?.[iconPickerState.itemIndex]?.iconAmenityId || ""
        }
        onSelectIcon={selectIconFromPicker}
        onClose={closeIconPicker}
      />
    </main>
  );
}

export default WebsiteEditorPage;
