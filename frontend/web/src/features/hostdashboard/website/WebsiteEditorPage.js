import React, { useEffect, useMemo, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "./services/websiteDraftService";
import {
  fetchWebsiteSiteByPropertyId,
  publishWebsiteSite,
  unpublishWebsiteSite,
} from "./services/websiteSiteService";
import { fetchWebsitePropertyDetails } from "./services/websitePropertyService";
import { getAmenityIconOptions } from "./rendering/amenityIconRegistry";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import WebsiteTemplatePreview from "./rendering/WebsiteTemplatePreview";
import {
  applyWebsiteDraftContentOverrides,
  buildWebsiteDraftEditorValues,
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
import {
  announceWebsiteLiveSiteUpdate,
  announceWebsitePreviewUpdate,
  WEBSITE_LIVE_SITE_UPDATE_MESSAGE_TYPE,
} from "./services/websitePreviewSync";
import { buildPublishedWebsiteHref } from "./websitePublicSiteLinks";
import {
  EDITOR_SECTION_KEYS,
  EDITOR_TARGET_KEYS,
  PREVIEW_VIEWPORT_OPTIONS,
  TEMPLATE_COPY_COLLECTION_CONFIG,
  TEMPLATE_IMAGE_SLOT_MAP,
  TEMPLATE_VISIBILITY_FIELD_MAP,
  getCalendarTextFields,
  getCalendarToggleFields,
  getCommonTextFields,
  getContactSectionFields,
  getCollectionTargetId,
  getImageSlotTargetId,
  getResidenceTextFields,
  getResidenceToggleFields,
} from "./websiteEditorConfig";
import {
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  WEBSITE_CONTACT_AVATAR_MODE_INITIALS,
  resolveWebsiteContactAccentColor,
  resolveWebsiteContactAvatarMode,
  resolveWebsiteContactBackgroundColor,
} from "./config/websiteContactSectionConfig";
import {
  resolveWebsiteResidencePanelColor,
} from "./config/websiteResidenceSectionConfig";
import {
  MAX_WEBSITE_CONFIGURABLE_AMENITIES,
  resolveWebsiteAmenityIconColor,
  WEBSITE_AMENITY_FALLBACK_CATEGORY,
} from "./config/websiteAmenitiesConfig";
import {
  getDefaultWebsiteCalendarPanelColor,
  resolveWebsiteCalendarPanelColor,
} from "./config/websiteCalendarSectionConfig";
import { setWebsiteImageSlotRotationEnabled } from "./rendering/websiteImageSlotUtils";
import WebsiteIconPickerDialog from "./WebsiteIconPickerDialog";
import WebsiteImagePickerDialog from "./WebsiteImagePickerDialog";
import {
  AmenityIconSelectField,
  BackgroundColorField,
  CollapsibleSection,
  TextField,
} from "./editor/WebsiteEditorFields";
import {
  WebsiteEditorActionMenu,
  WebsiteEditorErrorState,
  WebsiteEditorLoadingState,
  WebsiteEditorPublicSitePanel,
} from "./editor/WebsiteEditorStates";
import { WebsiteEditorVisibilityToggleCard } from "./editor/WebsiteEditorVisibilityToggleCard";
import { useWebsiteEditorTargeting } from "./editor/hooks/useWebsiteEditorTargeting";
import { WebsiteEditorAmenitiesSection } from "./editor/sections/WebsiteEditorAmenitiesSection";
import { WebsiteEditorContactSection } from "./editor/sections/WebsiteEditorContactSection";
import { WebsiteEditorCalendarSection } from "./editor/sections/WebsiteEditorCalendarSection";
import { WebsiteEditorImageSlotsSection } from "./editor/sections/WebsiteEditorImageSlotsSection";
import { WebsiteEditorResidenceSection } from "./editor/sections/WebsiteEditorResidenceSection";
import {
  buildEditorValuesFromDraft,
  confirmDiscardDraftChanges,
  createAmenityEditorItem,
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
  normalizeUiErrorMessage,
  readImageFileAsDataUrl,
  resolveWindowTargetOrigin,
  runAfterNextPaint,
} from "./editor/websiteEditorUtils";
import styles from "./WebsiteEditorPage.module.scss";

const loadWebsiteEditorState = async (propertyId) => {
  const [draft, propertyDetails] = await Promise.all([
    fetchWebsiteDraftByPropertyId(propertyId),
    fetchWebsitePropertyDetails(propertyId),
  ]);

  if (!draft) {
    throw new Error("Website draft not found for this listing.");
  }

  const nextBaseModel = buildWebsiteTemplateModel({
    propertyDetails,
    summaryProperty: null,
  });
  const nextTemplateKey = String(draft.templateKey || "").trim();
  const nextThemedModel = applyWebsiteDraftThemeOverrides(nextBaseModel, getDraftThemeOverrides(draft));
  const nextPreviewModel = applyWebsiteDraftContentOverrides(
    nextThemedModel,
    getDraftWorkingContentOverrides(draft),
    nextTemplateKey
  );

  let nextSiteSummary = null;
  let nextSiteSummaryError = "";
  try {
    nextSiteSummary = await fetchWebsiteSiteByPropertyId(propertyId);
  } catch (siteError) {
    nextSiteSummaryError = normalizeUiErrorMessage(
      siteError?.message,
      "We could not load the live site status for this listing."
    );
  }

  return {
    draft,
    nextBaseModel,
    nextEditorValues: buildWebsiteDraftEditorValues(nextPreviewModel, nextTemplateKey),
    nextSiteSummary,
    nextSiteSummaryError,
    nextThemeValues: buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(draft)),
  };
};

const getCommonFieldPreviewTargetId = (fieldKey, templateKey = "") => {
  if (fieldKey === "residenceTitle") {
    return EDITOR_TARGET_KEYS.residence.title;
  }

  if (fieldKey === "residenceHeadline") {
    return EDITOR_TARGET_KEYS.residence.headline;
  }

  if (fieldKey === "heroDescription" && templateKey === "panorama-landing") {
    return EDITOR_TARGET_KEYS.residence.description;
  }

  return EDITOR_TARGET_KEYS.common[fieldKey];
};

function WebsiteEditorPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
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
    [EDITOR_SECTION_KEYS.common]: true,
    [EDITOR_SECTION_KEYS.residence]: false,
    [EDITOR_SECTION_KEYS.calendar]: false,
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
  const [iconPickerState, setIconPickerState] = useState({
    isOpen: false,
    collectionKey: "",
    itemIndex: -1,
    label: "",
  });
  const actionMenuRef = useRef(null);
  const editorPanelRef = useRef(null);
  const openedLiveSiteWindowRef = useRef(null);
  const openedLiveSiteWindowOriginRef = useRef("");
  const amenityIconOptions = useMemo(() => getAmenityIconOptions(), []);
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
    onSelectImageSlot: (imageSlot) => {
      setImagePickerState({
        isOpen: true,
        slot: imageSlot,
      });
    },
    setExpandedSections,
  });

  useEffect(() => {
    let isMounted = true;

    const loadEditorState = async () => {
      setIsLoading(true);
      setLoadError("");
      setSiteSummaryError("");

      try {
        const {
          draft,
          nextBaseModel,
          nextEditorValues,
          nextSiteSummary,
          nextSiteSummaryError,
          nextThemeValues,
        } = await loadWebsiteEditorState(propertyId);

        if (!isMounted) {
          return;
        }

        setDraftRecord(draft);
        setBaseModel(nextBaseModel);
        setEditorValues(nextEditorValues);
        setSiteSummary(nextSiteSummary);
        setSiteSummaryError(nextSiteSummaryError);
        setThemeValues(nextThemeValues);
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
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadEditorState();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const draftTemplate = getWebsiteTemplateById(draftRecord?.templateKey);
  const commonTextFields = getCommonTextFields(draftRecord?.templateKey);
  const calendarTextFields = getCalendarTextFields(draftRecord?.templateKey);
  const calendarToggleFields = getCalendarToggleFields(draftRecord?.templateKey);
  const residenceTextFields = getResidenceTextFields(draftRecord?.templateKey);
  const residenceToggleFields = getResidenceToggleFields(draftRecord?.templateKey);
  const contactSectionFields = getContactSectionFields(draftRecord?.templateKey);
  const visibilityFields = TEMPLATE_VISIBILITY_FIELD_MAP[draftRecord?.templateKey] || [];
  const amenitiesVisibilityField = visibilityFields.find((field) => field.key === "amenitiesPanel") || null;
  const calendarVisibilityField = visibilityFields.find((field) => field.key === "availabilityCalendar") || null;
  const standaloneVisibilityFields = visibilityFields.filter(
    (field) => field.key !== "amenitiesPanel" && field.key !== "availabilityCalendar"
  );
  const imageSlots = TEMPLATE_IMAGE_SLOT_MAP[draftRecord?.templateKey] || [];
  const residenceImageSlot = imageSlots.find((slot) => slot.kind === "residence") || null;
  const generalImageSlots = imageSlots.filter((slot) => slot.kind !== "residence");
  const copyCollectionConfig = TEMPLATE_COPY_COLLECTION_CONFIG[draftRecord?.templateKey] || {};
  const residenceSectionTitle = String(editorValues?.common?.residenceTitle || "").trim() || "The residence";
  const importedImageOptions = useMemo(() => {
    const rawImageOptions = Array.isArray(baseModel?.media?.galleryImages) ? baseModel.media.galleryImages : [];
    return Array.from(new Set(rawImageOptions.map((imageUrl) => String(imageUrl || "").trim()).filter(Boolean)));
  }, [baseModel]);

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
      [EDITOR_SECTION_KEYS.common]: true,
      [EDITOR_SECTION_KEYS.residence]: false,
      [EDITOR_SECTION_KEYS.calendar]: false,
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

  const handleResidencePanelColorInputKeyDown = async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitResidencePanelColorInput();
    await saveDraftChanges();
  };

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

  const handleCalendarPanelColorInputKeyDown = async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitCalendarPanelColorInput();
    await saveDraftChanges();
  };

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

  const createContactColorInputKeyDownHandler = (fieldKey, resolveColor) => async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitContactColorInput(fieldKey, resolveColor);
    await saveDraftChanges();
  };

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

  const handleAmenitiesIconColorInputKeyDown = async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitAmenitiesIconColorInput();
    await saveDraftChanges();
  };

  const handleContactImageFileChange = async (event) => {
    const nextFile = event.target.files?.[0];
    event.target.value = "";

    if (!nextFile) {
      return;
    }

    setPreviewTargetId(EDITOR_TARGET_KEYS.contact.avatarImage);

    try {
      const nextAvatarImage = await readImageFileAsDataUrl(nextFile);
      setEditorValues((currentValues) => ({
        ...currentValues,
        contact: {
          ...currentValues.contact,
          avatarMode: WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
          avatarImage: nextAvatarImage,
        },
      }));
    } catch (error) {
      toast.error(
        normalizeUiErrorMessage(error?.message, "We could not upload that image for the contact footer.")
      );
    }
  };

  const updateContactAvatarMode = (avatarMode) => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.contact.avatarImage);
    setEditorValues((currentValues) => ({
      ...currentValues,
      contact: {
        ...currentValues.contact,
        avatarMode: resolveWebsiteContactAvatarMode(avatarMode, WEBSITE_CONTACT_AVATAR_MODE_HOST),
        avatarImage: "",
      },
    }));
  };

  const handleContactImageUseInitials = () => {
    updateContactAvatarMode(WEBSITE_CONTACT_AVATAR_MODE_INITIALS);
  };

  const handleContactImageUseProfilePhoto = () => {
    updateContactAvatarMode(WEBSITE_CONTACT_AVATAR_MODE_HOST);
  };

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

  const updateImageSlotSelection = (slot, nextValue) => {
    if (!slot) {
      return;
    }

    setPreviewTargetId(getImageSlotTargetId(slot));
    setEditorValues((currentValues) => {
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
    });
  };

  const openImagePicker = (slot) => {
    if (!slot || importedImageOptions.length < 1) {
      return;
    }

    setPreviewTargetId(getImageSlotTargetId(slot));
    setImagePickerState({
      isOpen: true,
      slot,
    });
  };

  const closeImagePicker = () => {
    setImagePickerState({
      isOpen: false,
      slot: null,
    });
  };

  const selectImageFromPicker = (imageUrl) => {
    if (!imagePickerState.slot || !imageUrl) {
      return;
    }

    updateImageSlotSelection(imagePickerState.slot, imageUrl);
    closeImagePicker();
  };

  const updateCollectionFieldValue = (collectionKey, itemIndex, fieldKey, nextValue) => {
    const targetId = getCollectionTargetId(collectionKey, itemIndex);

    setPreviewTargetId(targetId);
    setEditorValues((currentValues) => {
      const nextCollection = [...currentValues[collectionKey]];
      const currentItem = nextCollection[itemIndex];
      if (!currentItem) {
        return currentValues;
      }

      nextCollection[itemIndex] = {
        ...currentItem,
        [fieldKey]: nextValue,
      };

      return {
        ...currentValues,
        [collectionKey]: nextCollection,
      };
    });
  };

  const handleCollectionFieldChange = (collectionKey, itemIndex, fieldKey) => (event) => {
    updateCollectionFieldValue(collectionKey, itemIndex, fieldKey, event.target.value);
  };

  const openIconPicker = (collectionKey, itemIndex, label) => {
    if (!collectionKey || itemIndex < 0 || amenityIconOptions.length < 1) {
      return;
    }

    setPreviewTargetId(getCollectionTargetId(collectionKey, itemIndex));
    setIconPickerState({
      isOpen: true,
      collectionKey,
      itemIndex,
      label,
    });
  };

  const closeIconPicker = () => {
    setIconPickerState({
      isOpen: false,
      collectionKey: "",
      itemIndex: -1,
      label: "",
    });
  };

  const selectIconFromPicker = (iconAmenityId) => {
    if (!iconPickerState.collectionKey || iconPickerState.itemIndex < 0 || !iconAmenityId) {
      return;
    }

    if (iconPickerState.collectionKey === EDITOR_SECTION_KEYS.amenities) {
      const selectedIconOption = amenityIconOptions.find(
        (iconOption) => String(iconOption.id || "") === String(iconAmenityId || "")
      );
      setPreviewTargetId(EDITOR_TARGET_KEYS.amenities(iconPickerState.itemIndex));
      setEditorValues((currentValues) => {
        const nextAmenities = [...currentValues.amenities];
        const currentAmenity = nextAmenities[iconPickerState.itemIndex];
        if (!currentAmenity) {
          return currentValues;
        }

        nextAmenities[iconPickerState.itemIndex] = {
          ...currentAmenity,
          iconAmenityId,
          category:
            String(selectedIconOption?.category || "").trim() ||
            currentAmenity.category ||
            WEBSITE_AMENITY_FALLBACK_CATEGORY,
        };

        return {
          ...currentValues,
          amenities: nextAmenities,
        };
      });
      closeIconPicker();
      return;
    }

    updateCollectionFieldValue(
      iconPickerState.collectionKey,
      iconPickerState.itemIndex,
      "iconAmenityId",
      iconAmenityId
    );
    closeIconPicker();
  };

  const moveCollectionItem = (collectionKey, itemIndex, nextIndex) => {
    if (!collectionKey || itemIndex === nextIndex || itemIndex < 0 || nextIndex < 0) {
      return;
    }

    const nextTargetId = getCollectionTargetId(collectionKey, nextIndex);
    setPreviewTargetId(nextTargetId);
    setEditorValues((currentValues) => {
      const currentCollection = Array.isArray(currentValues[collectionKey]) ? currentValues[collectionKey] : [];
      if (nextIndex >= currentCollection.length || itemIndex >= currentCollection.length) {
        return currentValues;
      }

      const nextCollection = [...currentCollection];
      const [movedItem] = nextCollection.splice(itemIndex, 1);
      nextCollection.splice(nextIndex, 0, movedItem);

      return {
        ...currentValues,
        [collectionKey]: nextCollection,
      };
    });
  };

  const renderVisibilityFieldCard = (field) => {
    const visibilityTargetId = EDITOR_TARGET_KEYS.visibility(field.key);
    const inputId = `website-editor-visibility-${field.key}`;
    const labelId = `website-editor-visibility-${field.key}-label`;
    const descriptionId = `website-editor-visibility-${field.key}-description`;

    return (
      <WebsiteEditorVisibilityToggleCard
        key={field.key}
        targetRef={setTargetRef(visibilityTargetId)}
        field={field}
        inputId={inputId}
        labelId={labelId}
        descriptionId={descriptionId}
        checked={Boolean(editorValues.visibility[field.key])}
        onChange={handleVisibilityFieldChange(field.key)}
        isHighlighted={highlightedTargetId === visibilityTargetId}
      />
    );
  };

  const updateImageSlotRotation = (slot, nextEnabled) => {
    if (!slot) {
      return;
    }

    setPreviewTargetId(getImageSlotTargetId(slot));
    setEditorValues((currentValues) => ({
      ...currentValues,
      images: {
        ...currentValues.images,
        rotation: setWebsiteImageSlotRotationEnabled(
          currentValues?.images?.rotation,
          slot,
          nextEnabled,
          currentValues?.images?.gallery?.length
        ),
      },
    }));
  };

  const reloadDraftRecord = async () => {
    const persistedDraft = await fetchWebsiteDraftByPropertyId(propertyId);
    if (!persistedDraft) {
      throw new Error("Draft update completed, but the website draft could not be reloaded.");
    }

    setDraftRecord(persistedDraft);
    if (baseModel) {
      setEditorValues(buildEditorValuesFromDraft(baseModel, persistedDraft, draftTemplateKey));
    }
    setThemeValues(buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(persistedDraft)));

    return persistedDraft;
  };

  const persistDraftState = async ({ syncPublishedState = false } = {}) => {
    if (!draftRecord) {
      throw new Error("Website draft not found.");
    }

    await upsertWebsiteDraft({
      propertyId: draftRecord.propertyId,
      templateKey: draftRecord.templateKey,
      status: draftRecord.status || "DRAFT",
      contentOverrides: mergedContentOverrides,
      themeOverrides: mergedThemeOverrides,
      publishedContentOverrides: syncPublishedState ? mergedContentOverrides : publishedContentOverrides,
      publishedThemeOverrides: syncPublishedState ? mergedThemeOverrides : publishedThemeOverrides,
    });

    const nextDraft = await reloadDraftRecord();

    announceWebsitePreviewUpdate(nextDraft?.id || draftRecord.id);

    return nextDraft;
  };

  const saveDraftChanges = async () => {
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
  };

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
      await upsertWebsiteDraft({
        propertyId: draftRecord.propertyId,
        templateKey: draftRecord.templateKey,
        status: draftRecord.status || "DRAFT",
        contentOverrides: publishedContentOverrides,
        themeOverrides: publishedThemeOverrides,
      });

      await reloadDraftRecord();
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
      notifyOpenedLiveSiteWindow(nextSiteSummary);
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
      notifyOpenedLiveSiteWindow(nextSiteSummary);
      toast.success("Live site published.");
    } catch (error) {
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
      notifyOpenedLiveSiteWindow(nextSiteSummary);
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

  const addAmenityItem = () => {
    const nextAmenityIndex = editorValues.amenities.length;
    if (nextAmenityIndex >= MAX_WEBSITE_CONFIGURABLE_AMENITIES) {
      return;
    }

    setPreviewTargetId(EDITOR_TARGET_KEYS.amenities(nextAmenityIndex));
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenities: [
        ...currentValues.amenities,
        createAmenityEditorItem(amenityIconOptions, currentValues.amenities.length),
      ],
    }));

    runAfterNextPaint(() => {
      focusEditorTarget({
        sectionId: EDITOR_SECTION_KEYS.amenities,
        targetId: EDITOR_TARGET_KEYS.amenities(nextAmenityIndex),
      });
    });
  };

  const removeAmenityItem = (itemIndex) => {
    setPreviewTargetId("visibility.amenitiesPanel");
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenities: currentValues.amenities.filter((_, currentIndex) => currentIndex !== itemIndex),
    }));
  };

  const moveAmenityItemUp = (itemIndex) => {
    moveCollectionItem(EDITOR_SECTION_KEYS.amenities, itemIndex, itemIndex - 1);
  };

  const moveAmenityItemDown = (itemIndex) => {
    moveCollectionItem(EDITOR_SECTION_KEYS.amenities, itemIndex, itemIndex + 1);
  };

  const handleThemeBackgroundColorInputKeyDown = async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitThemeBackgroundColorInput();
    await saveDraftChanges();
  };

  const openLiveWebsiteLink = () => {
    const publishedDomain = String(primarySiteDomain?.domain || "").trim();
    if (!publishedDomain) {
      toast.error("This website does not have a live link yet.");
      return;
    }

    setIsActionMenuOpen(false);
    const publishedWebsiteHref = buildPublishedWebsiteHref(
      publishedDomain,
      siteSummary?.site?.id,
      primarySiteDomain?.status
    );
    const openedLiveSiteWindow = globalThis.open(publishedWebsiteHref, "_blank", "noopener,noreferrer");

    openedLiveSiteWindowRef.current = openedLiveSiteWindow;
    openedLiveSiteWindowOriginRef.current = openedLiveSiteWindow
      ? resolveWindowTargetOrigin(publishedWebsiteHref)
      : "";
  };

  const notifyOpenedLiveSiteWindow = (nextSiteSummary) => {
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

  const toggleActionMenu = () => {
    setIsActionMenuOpen((currentValue) => !currentValue);
  };

  useEffect(() => {
    if (!isActionMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setIsActionMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
      }
    };

    globalThis.document?.addEventListener("mousedown", handlePointerDown);
    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      globalThis.document?.removeEventListener("mousedown", handlePointerDown);
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionMenuOpen]);

  useEffect(() => {
    const isOverlayOpen = imagePickerState.isOpen || iconPickerState.isOpen;
    if (!isOverlayOpen) {
      return undefined;
    }

    const documentBody = globalThis.document?.body;
    const previousOverflow = documentBody?.style.overflow ?? "";
    if (documentBody) {
      documentBody.style.overflow = "hidden";
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (iconPickerState.isOpen) {
          closeIconPicker();
          return;
        }

        closeImagePicker();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);

    return () => {
      if (documentBody) {
        documentBody.style.overflow = previousOverflow;
      }
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [iconPickerState.isOpen, imagePickerState.isOpen]);

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

  if (isLoading) {
    return (
      <WebsiteEditorLoadingState
        renderLoadingSection={renderLoadingSection}
        editorPanelRef={editorPanelRef}
        onEditorPanelWheel={forwardEditorBoundaryScroll}
      />
    );
  }

  if (loadError || !draftRecord || !baseModel || !previewModel) {
    return <WebsiteEditorErrorState loadError={loadError} navigate={navigate} />;
  }

  const amenitiesVisibilityContent = amenitiesVisibilityField
    ? renderVisibilityFieldCard(amenitiesVisibilityField)
    : null;
  const amenitiesEditorSection = copyCollectionConfig.amenities ? (
    <WebsiteEditorAmenitiesSection
      activatePreviewTarget={activatePreviewTarget}
      addAmenityItem={addAmenityItem}
      amenitiesConfig={copyCollectionConfig.amenities}
      amenitiesVisibilityContent={amenitiesVisibilityContent}
      canAddAmenity={editorValues.amenities.length < copyCollectionConfig.amenities.maxCount}
      clearActivePreviewTarget={clearActivePreviewTarget}
      commitAmenitiesIconColorInput={commitAmenitiesIconColorInput}
      draftTemplateKey={draftTemplateKey}
      editorValues={editorValues}
      handleAmenitiesIconColorChange={handleAmenitiesIconColorChange}
      handleAmenitiesIconColorInputChange={handleAmenitiesIconColorInputChange}
      handleAmenitiesIconColorInputKeyDown={handleAmenitiesIconColorInputKeyDown}
      handleCollectionFieldChange={handleCollectionFieldChange}
      handleEditorFieldKeyDown={handleEditorFieldKeyDown}
      highlightedTargetId={highlightedTargetId}
      isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.amenities])}
      moveAmenityItemDown={moveAmenityItemDown}
      moveAmenityItemUp={moveAmenityItemUp}
      onOpenIconPicker={openIconPicker}
      removeAmenityItem={removeAmenityItem}
      sectionRef={setSectionRef(EDITOR_SECTION_KEYS.amenities)}
      setTargetRef={setTargetRef}
      toggleSection={toggleSection}
    />
  ) : null;

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.editorPage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Direct booking website editor</p>

            <div className={styles.heroHeader}>
              <div>
                <h1 className={styles.heroTitle}>{previewModel.site.title}</h1>
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
            <aside ref={editorPanelRef} className={styles.editorPanel} onWheel={forwardEditorBoundaryScroll}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Editor</h2>
              </div>

              <div className={styles.editorForm}>
                <CollapsibleSection
                  sectionId={EDITOR_SECTION_KEYS.common}
                  title="Common content"
                  description="Shared copy fields that affect the rendered website directly."
                  isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.common])}
                  onToggle={toggleSection}
                  sectionRef={setSectionRef(EDITOR_SECTION_KEYS.common)}
                >
                  <div className={styles.fieldStack}>
                    {commonTextFields.map((field) => (
                      <TextField
                        key={field.key}
                        field={field}
                        value={editorValues.common[field.key]}
                        onChange={handleCommonFieldChange(field.key)}
                        onKeyDown={handleEditorFieldKeyDown(field)}
                        fieldRef={setTargetRef(EDITOR_TARGET_KEYS.common[field.key])}
                        isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.common[field.key]}
                        onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.common[field.key])}
                        onBlur={clearActivePreviewTarget}
                      />
                    ))}
                  </div>
                </CollapsibleSection>

                {residenceTextFields.length > 0 || residenceToggleFields.length > 0 || residenceImageSlot ? (
                  <WebsiteEditorResidenceSection
                    activatePreviewTarget={activatePreviewTarget}
                    clearActivePreviewTarget={clearActivePreviewTarget}
                    commitResidencePanelColorInput={commitResidencePanelColorInput}
                    editorValues={editorValues}
                    handleCommonFieldChange={handleCommonFieldChange}
                    handleCommonToggleFieldChange={handleCommonToggleFieldChange}
                    handleEditorFieldKeyDown={handleEditorFieldKeyDown}
                    handleResidencePanelColorChange={handleResidencePanelColorChange}
                    handleResidencePanelColorInputChange={handleResidencePanelColorInputChange}
                    handleResidencePanelColorInputKeyDown={handleResidencePanelColorInputKeyDown}
                    highlightedTargetId={highlightedTargetId}
                    importedImageOptions={importedImageOptions}
                    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.residence])}
                    onChangeImageRotation={updateImageSlotRotation}
                    onOpenImagePicker={openImagePicker}
                    residenceImageSlot={residenceImageSlot}
                    residenceTextFields={residenceTextFields}
                    residenceToggleFields={residenceToggleFields}
                    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.residence)}
                    sectionTitle={residenceSectionTitle}
                    setTargetRef={setTargetRef}
                    toggleSection={toggleSection}
                  />
                ) : null}

                <CollapsibleSection
                  sectionId={EDITOR_SECTION_KEYS.theme}
                  title="Theme"
                  description="Choose the background surface color used behind the website sections."
                  isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.theme])}
                  onToggle={toggleSection}
                  sectionRef={setSectionRef(EDITOR_SECTION_KEYS.theme)}
                >
                  <BackgroundColorField
                    value={themeValues.backgroundColor}
                    customValue={themeValues.backgroundColorInput}
                    onSelectColor={handleThemeBackgroundColorChange}
                    onChangeCustomColor={handleThemeBackgroundColorInputChange}
                    onCommitCustomColor={commitThemeBackgroundColorInput}
                    onCustomColorKeyDown={handleThemeBackgroundColorInputKeyDown}
                  />
                </CollapsibleSection>

                {standaloneVisibilityFields.length > 0 ? (
                  <CollapsibleSection
                    sectionId={EDITOR_SECTION_KEYS.visibility}
                    title="Section visibility"
                    description="Toggle major sections without changing the underlying draft data."
                    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.visibility])}
                    onToggle={toggleSection}
                    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.visibility)}
                  >
                    <div className={styles.toggleStack}>
                      {standaloneVisibilityFields.map((field) => renderVisibilityFieldCard(field))}
                    </div>
                  </CollapsibleSection>
                ) : null}

                <WebsiteEditorImageSlotsSection
                  editorValues={editorValues}
                  highlightedTargetId={highlightedTargetId}
                  onChangeImageRotation={updateImageSlotRotation}
                  imageSlots={generalImageSlots}
                  importedImageOptions={importedImageOptions}
                  isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.images])}
                  onOpenImagePicker={openImagePicker}
                  onToggle={toggleSection}
                  sectionRef={setSectionRef(EDITOR_SECTION_KEYS.images)}
                  setTargetRef={setTargetRef}
                />

                {copyCollectionConfig.trustCards ? (
                  <CollapsibleSection
                    sectionId={EDITOR_SECTION_KEYS.trustCards}
                    title={copyCollectionConfig.trustCards.title}
                    description={copyCollectionConfig.trustCards.description}
                    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.trustCards])}
                    onToggle={toggleSection}
                    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.trustCards)}
                  >
                    <div className={styles.collectionStack}>
                      {editorValues.trustCards
                        .slice(0, copyCollectionConfig.trustCards.count)
                        .map((card, index) => (
                          <div
                            key={card.id}
                            ref={setTargetRef(EDITOR_TARGET_KEYS.trustCards(index))}
                            className={`${styles.collectionCard} ${
                              highlightedTargetId === EDITOR_TARGET_KEYS.trustCards(index)
                                ? styles.editorTargetHighlighted
                                : ""
                            }`.trim()}
                          >
                            <p className={styles.collectionTitle}>
                              {copyCollectionConfig.trustCards.itemLabel} {index + 1}
                            </p>
                            {copyCollectionConfig.trustCards.supportsIconSelection ? (
                              <AmenityIconSelectField
                                fieldKey={`trust-card-icon-${index}`}
                                label="Icon"
                                value={card.iconAmenityId || ""}
                                onOpenPicker={() =>
                                  openIconPicker(
                                    "trustCards",
                                    index,
                                    `${copyCollectionConfig.trustCards.itemLabel} ${index + 1} icon`
                                  )
                                }
                                onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.trustCards(index))}
                                onBlur={clearActivePreviewTarget}
                              />
                            ) : null}
                            <TextField
                              field={{ key: `trust-card-title-${index}`, label: "Title", component: "input" }}
                              value={card.title}
                              onChange={handleCollectionFieldChange("trustCards", index, "title")}
                              onKeyDown={handleEditorFieldKeyDown({ component: "input" })}
                              onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.trustCards(index))}
                              onBlur={clearActivePreviewTarget}
                            />
                            <TextField
                              field={{
                                key: `trust-card-description-${index}`,
                                label: "Description",
                                component: "textarea",
                              }}
                              value={card.description}
                              onChange={handleCollectionFieldChange("trustCards", index, "description")}
                              onKeyDown={handleEditorFieldKeyDown({ component: "textarea" })}
                              onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.trustCards(index))}
                              onBlur={clearActivePreviewTarget}
                            />
                          </div>
                        ))}
                    </div>
                  </CollapsibleSection>
                ) : null}

                {copyCollectionConfig.amenities?.placement === "afterTrustCards"
                  ? amenitiesEditorSection
                  : null}

                <WebsiteEditorCalendarSection
                  activatePreviewTarget={activatePreviewTarget}
                  calendarTextFields={calendarTextFields}
                  calendarToggleFields={calendarToggleFields}
                  calendarVisibilityField={calendarVisibilityField}
                  clearActivePreviewTarget={clearActivePreviewTarget}
                  commitCalendarPanelColorInput={commitCalendarPanelColorInput}
                  editorValues={editorValues}
                  handleCalendarFieldChange={handleCalendarFieldChange}
                  handleEditorFieldKeyDown={handleEditorFieldKeyDown}
                  handleCalendarPanelColorChange={handleCalendarPanelColorChange}
                  handleCalendarPanelColorInputChange={handleCalendarPanelColorInputChange}
                  handleCalendarPanelColorInputKeyDown={handleCalendarPanelColorInputKeyDown}
                  handleCalendarPanelToggleChange={handleCalendarPanelToggleChange}
                  handleVisibilityFieldChange={handleVisibilityFieldChange}
                  highlightedTargetId={highlightedTargetId}
                  isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.calendar])}
                  sectionRef={setSectionRef(EDITOR_SECTION_KEYS.calendar)}
                  setTargetRef={setTargetRef}
                  templateKey={draftTemplateKey}
                  toggleSection={toggleSection}
                />

                <WebsiteEditorContactSection
                  activatePreviewTarget={activatePreviewTarget}
                  clearActivePreviewTarget={clearActivePreviewTarget}
                  commitContactAccentColorInput={commitContactAccentColorInput}
                  commitContactBackgroundColorInput={commitContactBackgroundColorInput}
                  contactSectionFields={contactSectionFields}
                  editorValues={editorValues}
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
                  highlightedTargetId={highlightedTargetId}
                  isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.contact])}
                  onToggle={toggleSection}
                  previewModel={previewModel}
                  sectionRef={setSectionRef(EDITOR_SECTION_KEYS.contact)}
                  setTargetRef={setTargetRef}
                />

                {copyCollectionConfig.journeyStops ? (
                  <CollapsibleSection
                    sectionId={EDITOR_SECTION_KEYS.journeyStops}
                    title={copyCollectionConfig.journeyStops.title}
                    description={copyCollectionConfig.journeyStops.description}
                    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.journeyStops])}
                    onToggle={toggleSection}
                    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.journeyStops)}
                  >
                    <div className={styles.collectionStack}>
                      {editorValues.journeyStops
                        .slice(0, copyCollectionConfig.journeyStops.count)
                        .map((stop, index) => (
                          <div
                            key={stop.id}
                            ref={setTargetRef(EDITOR_TARGET_KEYS.journeyStops(index))}
                            className={`${styles.collectionCard} ${
                              highlightedTargetId === EDITOR_TARGET_KEYS.journeyStops(index)
                                ? styles.editorTargetHighlighted
                                : ""
                            }`.trim()}
                          >
                            <p className={styles.collectionTitle}>
                              {copyCollectionConfig.journeyStops.itemLabel} {index + 1}
                            </p>
                            <TextField
                              field={{ key: `journey-stop-title-${index}`, label: "Title", component: "input" }}
                              value={stop.title}
                              onChange={handleCollectionFieldChange("journeyStops", index, "title")}
                              onKeyDown={handleEditorFieldKeyDown({ component: "input" })}
                              onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.journeyStops(index))}
                              onBlur={clearActivePreviewTarget}
                            />
                            <TextField
                              field={{
                                key: `journey-stop-description-${index}`,
                                label: "Description",
                                component: "textarea",
                              }}
                              value={stop.description}
                              onChange={handleCollectionFieldChange("journeyStops", index, "description")}
                              onKeyDown={handleEditorFieldKeyDown({ component: "textarea" })}
                              onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.journeyStops(index))}
                              onBlur={clearActivePreviewTarget}
                            />
                          </div>
                        ))}
                    </div>
                  </CollapsibleSection>
                ) : null}

                {copyCollectionConfig.amenities?.placement === "afterJourneyStops"
                  ? amenitiesEditorSection
                  : null}

                <div className={styles.editorFooter}>
                  <p className={styles.editorFooterText}>
                    Saves this draft only. Enter saves single-line fields; Ctrl/Cmd + Enter saves multi-line fields.
                  </p>

                  <div className={styles.buttonRow}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={saveDraftChanges}
                      disabled={isMutatingDraft || !hasUnsavedChanges}
                    >
                      <SaveOutlinedIcon fontSize="small" />
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <section className={styles.previewPanel}>
              <div className={`${styles.panelHeader} ${styles.previewPanelHeader}`.trim()}>
                <div className={styles.previewPanelHeaderCopy}>
                  <div className={styles.previewPanelTitleRow}>
                    <h2 className={styles.panelTitle}>Website preview</h2>
                    <span className={styles.metaPill}>{draftTemplate.name}</span>
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

              <WebsiteTemplatePreview
                templateId={draftRecord.templateKey}
                model={previewModel}
                viewport={previewViewport}
                onSelectTarget={handlePreviewTargetSelect}
                activeTargetId={activePreviewTargetId}
              />
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
