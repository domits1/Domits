import React, { useEffect, useMemo, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import PropTypes from "prop-types";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "./services/websiteDraftService";
import { fetchWebsitePropertyDetails } from "./services/websitePropertyService";
import {
  getAmenityIconNode,
  getAmenityIconOptions,
} from "./rendering/amenityIconRegistry";
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
  WEBSITE_BACKGROUND_COLOR_OPTIONS,
} from "./rendering/websiteDraftThemeOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
import { announceWebsitePreviewUpdate } from "./services/websitePreviewSync";
import {
  COMMON_TEXT_FIELDS,
  EDITOR_SECTION_KEYS,
  EDITOR_TARGET_KEYS,
  LOADING_EDITOR_SECTIONS,
  PREVIEW_VIEWPORT_OPTIONS,
  TEMPLATE_COPY_COLLECTION_CONFIG,
  TEMPLATE_IMAGE_SLOT_MAP,
  TEMPLATE_VISIBILITY_FIELD_MAP,
  getCollectionTargetId,
  getImageSlotTargetId,
} from "./websiteEditorConfig";
import WebsiteIconPickerDialog from "./WebsiteIconPickerDialog";
import styles from "./WebsiteEditorPage.module.scss";
import arrowDownIcon from "../../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../../images/arrow-up-icon.svg";

const getImageOptionLabel = (index) => `Imported image ${index + 1}`;

const getSelectedImageForSlot = (slot, editorValues) =>
  slot.kind === "hero" ? editorValues.images.heroImage : editorValues.images.gallery[slot.index] || "";

const buildWebsitePreviewPath = (draftId) => `/website-preview/${encodeURIComponent(draftId)}`;

const getDraftWorkingContentOverrides = (draft) =>
  draft?.contentOverrides && typeof draft.contentOverrides === "object" ? draft.contentOverrides : {};

const getDraftPublishedContentOverrides = (draft) =>
  draft?.publishedContentOverrides && typeof draft.publishedContentOverrides === "object"
    ? draft.publishedContentOverrides
    : {};

const getDraftThemeOverrides = (draft) =>
  draft?.themeOverrides && typeof draft.themeOverrides === "object" ? draft.themeOverrides : {};

const getDraftPublishedThemeOverrides = (draft) =>
  draft?.publishedThemeOverrides && typeof draft.publishedThemeOverrides === "object"
    ? draft.publishedThemeOverrides
    : {};

const buildEditorValuesFromDraft = (baseModel, draft) =>
  buildWebsiteDraftEditorValues(
    applyWebsiteDraftContentOverrides(baseModel, getDraftWorkingContentOverrides(draft))
  );

const resolveSectionNode = (sectionRefEntry) => {
  if (!sectionRefEntry) {
    return null;
  }

  if (typeof sectionRefEntry.scrollIntoView === "function") {
    return sectionRefEntry;
  }

  if (sectionRefEntry.current && typeof sectionRefEntry.current.scrollIntoView === "function") {
    return sectionRefEntry.current;
  }

  return null;
};

const getCenteredContainerScrollTop = (node, container) => {
  if (
    !node ||
    !container ||
    typeof node.getBoundingClientRect !== "function" ||
    typeof container.getBoundingClientRect !== "function"
  ) {
    return null;
  }

  const containerHeight = container.clientHeight || 0;
  if (containerHeight < 1) {
    return null;
  }

  const nodeRect = node.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const currentScrollTop = container.scrollTop || 0;
  const centeredTop =
    currentScrollTop + nodeRect.top - containerRect.top - containerHeight / 2 + nodeRect.height / 2;
  return Math.max(0, Math.round(centeredTop));
};

const runAfterNextPaint = (callback) => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        callback();
      });
    });
    return;
  }

  globalThis.setTimeout(callback, 0);
};

const activatePreviewTargetId = (setActivePreviewTargetId, targetId) => {
  setActivePreviewTargetId(String(targetId || "").trim());
};

const clearPreviewTargetResetTimeout = (previewHighlightResetTimeoutRef) => {
  if (!previewHighlightResetTimeoutRef.current) {
    return;
  }

  globalThis.clearTimeout(previewHighlightResetTimeoutRef.current);
  previewHighlightResetTimeoutRef.current = null;
};

const activateTemporaryPreviewTargetId = (
  setActivePreviewTargetId,
  previewHighlightResetTimeoutRef,
  targetId,
  durationMs = 1800
) => {
  const normalizedTargetId = String(targetId || "").trim();
  clearPreviewTargetResetTimeout(previewHighlightResetTimeoutRef);
  setActivePreviewTargetId(normalizedTargetId);

  if (!normalizedTargetId) {
    return;
  }

  previewHighlightResetTimeoutRef.current = globalThis.setTimeout(() => {
    setActivePreviewTargetId((currentTargetId) =>
      currentTargetId === normalizedTargetId ? "" : currentTargetId
    );
    previewHighlightResetTimeoutRef.current = null;
  }, durationMs);
};

const getPreviewTargetIdForVisibilityField = (fieldKey) => {
  switch (String(fieldKey || "").trim()) {
    case "topBar":
      return EDITOR_TARGET_KEYS.common.siteTitle;
    case "trustCards":
      return "visibility.trustCards";
    case "gallerySection":
      return EDITOR_TARGET_KEYS.images.gallery(0);
    case "amenitiesPanel":
      return "visibility.amenitiesPanel";
    case "availabilityCalendar":
      return EDITOR_TARGET_KEYS.visibility("availabilityCalendar");
    case "callToAction":
      return EDITOR_TARGET_KEYS.common.ctaLabel;
    case "journeyStops":
      return "visibility.journeyStops";
    case "chatWidget":
      return "visibility.chatWidget";
    default:
      return EDITOR_TARGET_KEYS.common.heroTitle;
  }
};

const fieldPropTypes = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  component: PropTypes.oneOf(["input", "textarea"]).isRequired,
});

function TextField({
  field,
  value,
  onChange,
  onKeyDown = undefined,
  fieldRef = null,
  isHighlighted = false,
  onFocus = undefined,
  onBlur = undefined,
}) {
  if (field.component === "textarea") {
    return (
      <div
        ref={fieldRef}
        className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
      >
        <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
          {field.label}
        </label>
        <textarea
          id={`website-editor-${field.key}`}
          className={styles.textArea}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
    );
  }

  return (
    <div
      ref={fieldRef}
      className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
        {field.label}
      </label>
      <input
        id={`website-editor-${field.key}`}
        className={styles.textInput}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
}

TextField.propTypes = {
  field: fieldPropTypes.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  fieldRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  isHighlighted: PropTypes.bool,
  onKeyDown: PropTypes.func,
};

function AmenityIconSelectField({
  fieldKey,
  label,
  value,
  onOpenPicker,
  onFocus = undefined,
  onBlur = undefined,
  fieldRef = null,
  isHighlighted = false,
}) {
  const selectedIconNode = getAmenityIconNode(value, {
    className: styles.iconSelectionPreviewGlyph,
    "aria-hidden": true,
    focusable: "false",
    sx: {
      color: "#1f4e79",
      fontSize: 22,
      padding: 0,
    },
  });
  return (
    <div
      ref={fieldRef}
      className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <button
        id={`website-editor-${fieldKey}`}
        type="button"
        className={styles.iconSelectionTrigger}
        onClick={onOpenPicker}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={`Choose icon for ${label.toLowerCase()}`}
        title={`Choose icon for ${label.toLowerCase()}`}
      >
        <span className={styles.iconSelectionPreviewIcon} aria-hidden="true">
          {selectedIconNode}
        </span>
      </button>
    </div>
  );
}

AmenityIconSelectField.propTypes = {
  fieldKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onOpenPicker: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  fieldRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  isHighlighted: PropTypes.bool,
};

function BackgroundColorField({
  value,
  customValue,
  onSelectColor,
  onChangeCustomColor,
  onCommitCustomColor,
  onCustomColorKeyDown,
}) {
  const hasPresetSelection = WEBSITE_BACKGROUND_COLOR_OPTIONS.some(
    (colorOption) => colorOption.value === value
  );

  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldLabel}>Background color</div>
      <div className={styles.colorGrid} role="radiogroup" aria-label="Website background color">
        {WEBSITE_BACKGROUND_COLOR_OPTIONS.map((colorOption) => {
          const isSelected = colorOption.value === value;
          return (
            <button
              key={colorOption.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.colorSwatchButton} ${isSelected ? styles.colorSwatchButtonSelected : ""}`.trim()}
              onClick={() => onSelectColor(colorOption.value)}
              title={colorOption.label}
            >
              <span
                className={styles.colorSwatch}
                style={{ backgroundColor: colorOption.value }}
                aria-hidden="true"
              />
              <span className={styles.colorSwatchLabel}>{colorOption.label}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.customColorSection}>
        <div className={styles.customColorHeader}>
          <span className={styles.fieldLabel}>Custom color</span>
          <p className={styles.customColorHint}>
            Use a hex value if the preset grid is too limiting.
          </p>
        </div>
        <div className={styles.customColorRow}>
          <label
            className={`${styles.colorPickerShell} ${hasPresetSelection ? "" : styles.colorPickerShellSelected}`.trim()}
            aria-label="Pick a custom website background color"
          >
            <input
              type="color"
              className={styles.colorPickerInput}
              value={resolveWebsiteBackgroundColor(value)}
              onChange={(event) => onSelectColor(event.target.value)}
            />
          </label>
          <input
            type="text"
            className={`${styles.textInput} ${styles.customColorInput}`}
            value={customValue}
            onChange={(event) => onChangeCustomColor(event.target.value)}
            onBlur={onCommitCustomColor}
            onKeyDown={onCustomColorKeyDown}
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="#ffffff"
            aria-label="Custom background color hex code"
          />
        </div>
      </div>
    </div>
  );
}

BackgroundColorField.propTypes = {
  value: PropTypes.string.isRequired,
  customValue: PropTypes.string.isRequired,
  onSelectColor: PropTypes.func.isRequired,
  onChangeCustomColor: PropTypes.func.isRequired,
  onCommitCustomColor: PropTypes.func.isRequired,
  onCustomColorKeyDown: PropTypes.func.isRequired,
};

function CollapsibleSection({
  sectionId,
  title,
  description,
  isOpen,
  onToggle,
  sectionRef = null,
  children,
}) {
  const toggleIcon = isOpen ? arrowUpIcon : arrowDownIcon;

  return (
    <section
      ref={sectionRef}
      className={styles.panelSection}
    >
      <button
        type="button"
        className={styles.sectionToggle}
        onClick={() => onToggle(sectionId)}
        aria-expanded={isOpen}
      >
        <div className={styles.sectionBlockHeader}>
          <h3 className={styles.sectionBlockTitle}>{title}</h3>
          <p className={styles.sectionBlockDescription}>{description}</p>
        </div>
        <img
          src={toggleIcon}
          alt=""
          aria-hidden="true"
          className={styles.sectionToggleIcon}
        />
      </button>

      <div
        className={`${styles.panelSectionBody} ${isOpen ? styles.panelSectionBodyOpen : ""}`.trim()}
        aria-hidden={!isOpen}
      >
        <div className={styles.panelSectionBodyInner}>{children}</div>
      </div>
    </section>
  );
}

CollapsibleSection.propTypes = {
  sectionId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  sectionRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  children: PropTypes.node.isRequired,
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
  const [isUpdatingLivePreview, setIsUpdatingLivePreview] = useState(false);
  const [highlightedTargetId, setHighlightedTargetId] = useState("");
  const [activePreviewTargetId, setActivePreviewTargetId] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    [EDITOR_SECTION_KEYS.common]: true,
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
  const sectionRefs = useRef({});
  const targetRefs = useRef({});
  const editorPanelRef = useRef(null);
  const sectionHighlightResetTimeoutRef = useRef(null);
  const previewHighlightResetTimeoutRef = useRef(null);
  const amenityIconOptions = useMemo(() => getAmenityIconOptions(), []);

  useEffect(() => {
    let isMounted = true;

    const loadEditorState = async () => {
      setIsLoading(true);
      setLoadError("");

      try {
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
        const nextThemedModel = applyWebsiteDraftThemeOverrides(nextBaseModel, getDraftThemeOverrides(draft));
        const nextPreviewModel = applyWebsiteDraftContentOverrides(nextThemedModel, getDraftWorkingContentOverrides(draft));

        if (!isMounted) {
          return;
        }

        setDraftRecord(draft);
        setBaseModel(nextBaseModel);
        setEditorValues(buildWebsiteDraftEditorValues(nextPreviewModel));
        setThemeValues(buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(draft)));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDraftRecord(null);
        setBaseModel(null);
        setEditorValues(createEmptyWebsiteDraftEditorValues());
        setThemeValues(createEmptyWebsiteDraftThemeEditorValues());
        setLoadError(error?.message || "We could not open this website draft.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadEditorState();

    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  const draftTemplate = getWebsiteTemplateById(draftRecord?.templateKey);
  const visibilityFields = TEMPLATE_VISIBILITY_FIELD_MAP[draftRecord?.templateKey] || [];
  const imageSlots = TEMPLATE_IMAGE_SLOT_MAP[draftRecord?.templateKey] || [];
  const copyCollectionConfig = TEMPLATE_COPY_COLLECTION_CONFIG[draftRecord?.templateKey] || {};
  const importedImageOptions = useMemo(() => {
    const rawImageOptions = Array.isArray(baseModel?.media?.galleryImages) ? baseModel.media.galleryImages : [];
    return Array.from(new Set(rawImageOptions.map((imageUrl) => String(imageUrl || "").trim()).filter(Boolean)));
  }, [baseModel]);

  const contentOverridePatch = useMemo(() => {
    if (!baseModel) {
      return {};
    }

    return buildWebsiteDraftOverridePatch(editorValues, baseModel);
  }, [baseModel, editorValues]);

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
    return applyWebsiteDraftContentOverrides(themedModel, mergedContentOverrides);
  }, [baseModel, mergedContentOverrides, mergedThemeOverrides]);

  const hasUnsavedChanges = useMemo(() => {
    const persistedOverrides = getDraftWorkingContentOverrides(draftRecord);
    const persistedThemeOverrides = getDraftThemeOverrides(draftRecord);
    return (
      JSON.stringify(mergedContentOverrides) !== JSON.stringify(persistedOverrides) ||
      JSON.stringify(mergedThemeOverrides) !== JSON.stringify(persistedThemeOverrides)
    );
  }, [draftRecord, mergedContentOverrides, mergedThemeOverrides]);

  const hasPreviewSyncPending = useMemo(
    () =>
      JSON.stringify(mergedContentOverrides) !== JSON.stringify(publishedContentOverrides) ||
      JSON.stringify(mergedThemeOverrides) !== JSON.stringify(publishedThemeOverrides),
    [mergedContentOverrides, publishedContentOverrides, mergedThemeOverrides, publishedThemeOverrides]
  );

  const isMutatingDraft = isSaving || isDiscardingChanges || isUpdatingLivePreview;

  useEffect(() => {
    setExpandedSections({
      [EDITOR_SECTION_KEYS.common]: true,
      [EDITOR_SECTION_KEYS.theme]: false,
      [EDITOR_SECTION_KEYS.visibility]: false,
      [EDITOR_SECTION_KEYS.images]: false,
      [EDITOR_SECTION_KEYS.trustCards]: false,
      [EDITOR_SECTION_KEYS.journeyStops]: false,
    });
  }, [draftRecord?.templateKey]);

  useEffect(
    () => () => {
      if (sectionHighlightResetTimeoutRef.current) {
        globalThis.clearTimeout(sectionHighlightResetTimeoutRef.current);
      }

      clearPreviewTargetResetTimeout(previewHighlightResetTimeoutRef);
    },
    []
  );

  const toggleSection = (sectionId) => {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [sectionId]: !currentSections[sectionId],
    }));
  };

  const openSection = (sectionId) => {
    setExpandedSections((currentSections) => {
      if (currentSections[sectionId]) {
        return currentSections;
      }

      return {
        ...currentSections,
        [sectionId]: true,
      };
    });
  };

  const setSectionRef = (sectionId) => (node) => {
    sectionRefs.current[sectionId] = node;
  };

  const setTargetRef = (targetId) => (node) => {
    targetRefs.current[targetId] = node;
  };

  const resolvePreviewTargetId = ({ targetId, imageSlot, sectionId } = {}) => {
    if (targetId) {
      return targetId;
    }

    if (imageSlot?.kind === "hero") {
      return EDITOR_TARGET_KEYS.images.hero;
    }

    if (imageSlot?.kind === "gallery" && Number.isInteger(imageSlot.index)) {
      return EDITOR_TARGET_KEYS.images.gallery(imageSlot.index);
    }

    if (sectionId === EDITOR_SECTION_KEYS.common) {
      return EDITOR_TARGET_KEYS.common.heroTitle;
    }

    return "";
  };

  const focusEditorTarget = ({ sectionId, targetId }) => {
    if (!sectionId) {
      return;
    }

    openSection(sectionId);
    setHighlightedTargetId("");

    const resolvedTargetId = resolvePreviewTargetId({ sectionId, targetId });

    globalThis.setTimeout(() => {
      if (resolvedTargetId) {
        setHighlightedTargetId(resolvedTargetId);
      }
    }, 0);

    if (sectionHighlightResetTimeoutRef.current) {
      globalThis.clearTimeout(sectionHighlightResetTimeoutRef.current);
    }

    sectionHighlightResetTimeoutRef.current = globalThis.setTimeout(() => {
      setHighlightedTargetId("");
    }, 1800);

    runAfterNextPaint(() => {
      const targetEditorNode =
        resolveSectionNode(targetRefs.current[resolvedTargetId]) ||
        resolveSectionNode(sectionRefs.current[sectionId]);

      const centeredScrollTop = getCenteredContainerScrollTop(targetEditorNode, editorPanelRef.current);
      if (centeredScrollTop !== null && editorPanelRef.current) {
        editorPanelRef.current.scrollTo({
          top: centeredScrollTop,
          behavior: "smooth",
        });
        return;
      }

      targetEditorNode?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  };

  const handlePreviewTargetSelect = ({ sectionId, targetId, imageSlot } = {}) => {
    if (imageSlot) {
      focusEditorTarget({
        sectionId: EDITOR_SECTION_KEYS.images,
        targetId: targetId || resolvePreviewTargetId({ imageSlot, sectionId: EDITOR_SECTION_KEYS.images }),
      });
      globalThis.setTimeout(() => {
        openImagePicker(imageSlot);
      }, 140);
      return;
    }

    if (sectionId) {
      focusEditorTarget({ sectionId, targetId });
    }
  };

  const handleCommonFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    activatePreviewTargetId(setActivePreviewTargetId, EDITOR_TARGET_KEYS.common[fieldKey]);
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        [fieldKey]: nextValue,
      },
    }));
  };

  const handleThemeBackgroundColorChange = (backgroundColor) => {
    activatePreviewTargetId(setActivePreviewTargetId, EDITOR_TARGET_KEYS.common.siteTitle);
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
    activatePreviewTargetId(setActivePreviewTargetId, EDITOR_TARGET_KEYS.common.siteTitle);
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

  const activatePreviewTarget = (targetId) => () => {
    activatePreviewTargetId(setActivePreviewTargetId, targetId);
  };

  const clearActivePreviewTarget = () => {
    clearPreviewTargetResetTimeout(previewHighlightResetTimeoutRef);
    setActivePreviewTargetId("");
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
    setActivePreviewTargetId("");
    runAfterNextPaint(() => {
      activateTemporaryPreviewTargetId(
        setActivePreviewTargetId,
        previewHighlightResetTimeoutRef,
        previewTargetId
      );
    });
  };

  const updateImageSlotSelection = (slot, nextValue) => {
    if (!slot) {
      return;
    }

    activatePreviewTargetId(setActivePreviewTargetId, getImageSlotTargetId(slot));
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

    activatePreviewTargetId(setActivePreviewTargetId, getImageSlotTargetId(slot));
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

    activatePreviewTargetId(setActivePreviewTargetId, targetId);
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

    activatePreviewTargetId(setActivePreviewTargetId, getCollectionTargetId(collectionKey, itemIndex));
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

    updateCollectionFieldValue(
      iconPickerState.collectionKey,
      iconPickerState.itemIndex,
      "iconAmenityId",
      iconAmenityId
    );
    closeIconPicker();
  };

  const reloadDraftRecord = async () => {
    const persistedDraft = await fetchWebsiteDraftByPropertyId(propertyId);
    if (!persistedDraft) {
      throw new Error("Draft update completed, but the website draft could not be reloaded.");
    }

    setDraftRecord(persistedDraft);
    if (baseModel) {
      setEditorValues(buildEditorValuesFromDraft(baseModel, persistedDraft));
    }
    setThemeValues(buildWebsiteDraftThemeEditorValues(getDraftThemeOverrides(persistedDraft)));

    return persistedDraft;
  };

  const saveDraftChanges = async () => {
    if (!draftRecord || !hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);

    try {
      await upsertWebsiteDraft({
        propertyId: draftRecord.propertyId,
        templateKey: draftRecord.templateKey,
        status: draftRecord.status || "DRAFT",
        contentOverrides: mergedContentOverrides,
        themeOverrides: mergedThemeOverrides,
        publishedContentOverrides,
        publishedThemeOverrides,
      });

      await reloadDraftRecord();
      toast.success("Draft changes saved.");
    } catch (error) {
      toast.error(error?.message || "We could not save your website changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const discardDraftChanges = async () => {
    if (!draftRecord || !hasPreviewSyncPending || isMutatingDraft) {
      return;
    }

    const canConfirmDiscardChanges = typeof globalThis.confirm === "function";
    const confirmed = canConfirmDiscardChanges
      ? globalThis.confirm(
          "Discard all draft-only changes and reset this editor back to the current live preview version?"
        )
      : true;
    const discardWasCancelled = confirmed === false;
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
      toast.success("Draft reverted to the live preview version.");
    } catch (error) {
      toast.error(error?.message || "We could not discard your draft changes.");
    } finally {
      setIsDiscardingChanges(false);
    }
  };

  const updateLivePreviewChanges = async () => {
    if (!draftRecord || !hasPreviewSyncPending || isMutatingDraft) {
      return;
    }

    setIsUpdatingLivePreview(true);

    try {
      await upsertWebsiteDraft({
        propertyId: draftRecord.propertyId,
        templateKey: draftRecord.templateKey,
        status: draftRecord.status || "DRAFT",
        contentOverrides: mergedContentOverrides,
        themeOverrides: mergedThemeOverrides,
        publishedContentOverrides: mergedContentOverrides,
        publishedThemeOverrides: mergedThemeOverrides,
      });

      await reloadDraftRecord();
      announceWebsitePreviewUpdate(draftRecord.id);
      toast.success("Live preview updated.");
    } catch (error) {
      toast.error(error?.message || "We could not update the live preview.");
    } finally {
      setIsUpdatingLivePreview(false);
    }
  };

  const handleEditorFieldKeyDown = (field) => async (event) => {
    if (field.component === "textarea") {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        await saveDraftChanges();
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await saveDraftChanges();
    }
  };

  const handleThemeBackgroundColorInputKeyDown = async (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    commitThemeBackgroundColorInput();
    await saveDraftChanges();
  };

  const openWebsitePreviewLink = () => {
    const draftId = String(draftRecord?.id || "").trim();
    if (!draftId) {
      toast.error("This website does not have a preview link yet.");
      return;
    }

    globalThis.open(buildWebsitePreviewPath(draftId), "_blank", "noopener,noreferrer");
  };

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
      <main className="page-Host">
        <div className="page-Host-content">
          <section className={styles.editorPage}>
            <div className={styles.heroCard}>
              <p className={styles.eyebrow}>Standalone website draft editor</p>
              <div className={styles.heroHeader}>
                <div>
                  <h1 className={styles.heroTitle}>Opening website editor</h1>
                  <p className={styles.heroDescription}>
                    Imported listing data, saved overrides, and template bindings are loading into the
                    editor surface.
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.surface}>
              <aside ref={editorPanelRef} className={styles.editorPanel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.panelTitle}>Editor</h2>
                </div>

                <div className={styles.editorForm}>{LOADING_EDITOR_SECTIONS.map(renderLoadingSection)}</div>
              </aside>

              <section className={styles.previewPanel}>
                <div className={`${styles.panelHeader} ${styles.previewPanelHeader}`.trim()}>
                  <h2 className={styles.panelTitle}>Live preview</h2>
                </div>

                <div className={styles.loadingPreviewCard}>
                  <PulseBarsLoader message="Loading live website preview..." />
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loadError || !draftRecord || !baseModel || !previewModel) {
    return (
      <main className="page-Host">
        <div className="page-Host-content">
          <section className={styles.editorPage}>
            <div className={`${styles.stateCard} ${styles.stateCardError}`}>
              <p className={styles.errorText}>{loadError || "We could not open this website draft."}</p>
              <div className={styles.buttonRow}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigate("/hostdashboard/website")}
                >
                  Back to website workspace
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.editorPage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Standalone website draft editor</p>

            <div className={styles.heroHeader}>
              <div>
                <h1 className={styles.heroTitle}>{previewModel.site.title}</h1>
                <p className={styles.heroDescription}>
                  The builder now creates the draft. This page is the dedicated editing surface for saved
                  websites, including controlled copy changes, section visibility, and image slot selection.
                </p>
              </div>

              <div className={styles.heroMeta}>
                <span className={styles.metaPill}>{draftTemplate.name}</span>
                <span className={styles.metaPill}>{draftRecord.status || "DRAFT"}</span>
                {previewModel.location.label ? (
                  <span className={styles.metaPill}>{previewModel.location.label}</span>
                ) : null}
              </div>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate("/hostdashboard/website")}
              >
                <ArrowBackIcon fontSize="small" />
                Back to website workspace
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={openWebsitePreviewLink}
              >
                Open live preview
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void updateLivePreviewChanges()}
                disabled={isMutatingDraft || !hasPreviewSyncPending}
              >
                {isUpdatingLivePreview ? "Updating..." : "Update live preview"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void discardDraftChanges()}
                disabled={isMutatingDraft || !hasPreviewSyncPending}
              >
                {isDiscardingChanges ? "Discarding..." : "Discard all changes"}
              </button>
            </div>
          </div>

          <div className={styles.surface}>
            <aside ref={editorPanelRef} className={styles.editorPanel}>
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
                    {COMMON_TEXT_FIELDS.map((field) => (
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

                {visibilityFields.length > 0 ? (
                  <CollapsibleSection
                    sectionId={EDITOR_SECTION_KEYS.visibility}
                    title="Section visibility"
                    description="Toggle major sections without changing the underlying draft data."
                    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.visibility])}
                    onToggle={toggleSection}
                    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.visibility)}
                  >
                    <div className={styles.toggleStack}>
                      {visibilityFields.map((field) => {
                        const visibilityTargetId = EDITOR_TARGET_KEYS.visibility(field.key);
                        const inputId = `website-editor-visibility-${field.key}`;
                        const labelId = `website-editor-visibility-${field.key}-label`;
                        const descriptionId = `website-editor-visibility-${field.key}-description`;

                        return (
                          <label
                            key={field.key}
                            ref={setTargetRef(visibilityTargetId)}
                            htmlFor={inputId}
                            className={`${styles.toggleCard} ${
                              highlightedTargetId === visibilityTargetId ? styles.editorTargetHighlighted : ""
                            }`.trim()}
                          >
                            <div className={styles.toggleCopy}>
                              <span id={labelId} className={styles.toggleLabel}>{field.label}</span>
                              <span id={descriptionId} className={styles.toggleDescription}>{field.description}</span>
                            </div>
                            <input
                              id={inputId}
                              type="checkbox"
                              className={styles.toggleInput}
                              checked={Boolean(editorValues.visibility[field.key])}
                              onChange={handleVisibilityFieldChange(field.key)}
                              aria-labelledby={labelId}
                              aria-describedby={descriptionId}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                ) : null}

                {imageSlots.length > 0 ? (
                  <CollapsibleSection
                    sectionId={EDITOR_SECTION_KEYS.images}
                    title="Image slots"
                    description="Reassign imported listing images to the key visual slots used by this template."
                    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.images])}
                    onToggle={toggleSection}
                    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.images)}
                  >
                    <div className={styles.imageSlotGrid}>
                      {imageSlots.map((slot) => {
                        const selectedImageUrl = getSelectedImageForSlot(slot, editorValues);
                        const selectedImageIndex = importedImageOptions.indexOf(selectedImageUrl);
                        const imageSlotTargetId = getImageSlotTargetId(slot);
                        const isImageSlotHighlighted = highlightedTargetId === imageSlotTargetId;
                        let selectedImageLabel = "No imported image assigned";
                        if (selectedImageIndex > -1) {
                          selectedImageLabel = getImageOptionLabel(selectedImageIndex);
                        }

                        return (
                          <div
                            key={slot.id}
                            ref={setTargetRef(imageSlotTargetId)}
                            className={`${styles.imageSlotCard} ${isImageSlotHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
                          >
                            <div className={styles.imageSlotPreview}>
                              {selectedImageUrl ? (
                                <img src={selectedImageUrl} alt={slot.label} className={styles.imageSlotPreviewImage} />
                              ) : (
                                <span className={styles.imageSlotPreviewEmpty}>No image selected</span>
                              )}
                            </div>

                            <div className={styles.imageSlotMeta}>
                              <div className={styles.fieldGroup}>
                                <span className={styles.fieldLabel}>{slot.label}</span>
                                <span className={styles.helperText}>{selectedImageLabel}</span>
                              </div>

                              <button
                                type="button"
                                className={styles.secondaryButton}
                                onClick={() => openImagePicker(slot)}
                                disabled={importedImageOptions.length < 1}
                              >
                                <CollectionsOutlinedIcon fontSize="small" />
                                Choose image
                              </button>
                            </div>

                            <p className={styles.helperText}>{slot.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                ) : null}

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

                <div className={styles.editorFooter}>
                  <p className={styles.editorFooterText}>
                    Saves this draft only. Enter saves single-line fields; Ctrl/Cmd + Enter saves multi-line fields.
                  </p>

                  <div className={styles.buttonRow}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => void saveDraftChanges()}
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
                <h2 className={styles.panelTitle}>Live preview</h2>
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

      {imagePickerState.isOpen && imagePickerState.slot ? (
        <dialog
          open
          className={styles.imagePickerOverlay}
          aria-label={`Select image for ${imagePickerState.slot.label}`}
          onCancel={(event) => {
            event.preventDefault();
            closeImagePicker();
          }}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeImagePicker();
            }
          }}
        >
          <section className={styles.imagePickerDialog}>
            <div className={styles.imagePickerHeader}>
              <div className={styles.imagePickerHeaderCopy}>
                <p className={styles.eyebrow}>Choose imported image</p>
                <h2 className={styles.panelTitle}>{imagePickerState.slot.label}</h2>
                <p className={styles.panelDescription}>
                  Pick from the imported listing photos. Selecting a thumbnail applies it immediately to
                  this slot.
                </p>
              </div>

              <button
                type="button"
                className={styles.imagePickerCloseButton}
                onClick={closeImagePicker}
                aria-label="Close image picker"
              >
                <CloseOutlinedIcon fontSize="small" />
              </button>
            </div>

            <div className={styles.imagePickerMetaRow}>
              <span className={styles.imagePickerCount}>
                {importedImageOptions.length} imported {importedImageOptions.length === 1 ? "image" : "images"}
              </span>
              <span className={styles.helperText}>Scroll and click a thumbnail to assign it.</span>
            </div>

            <div className={styles.imagePickerThumbRail}>
              {importedImageOptions.map((imageUrl, index) => {
                const isSelected = imageUrl === getSelectedImageForSlot(imagePickerState.slot, editorValues);

                return (
                  <button
                    key={`${imagePickerState.slot.label}-${index}-${imageUrl}`}
                    type="button"
                    className={`${styles.imagePickerThumbButton} ${
                      isSelected ? styles.imagePickerThumbButtonActive : ""
                    }`.trim()}
                    onClick={() => selectImageFromPicker(imageUrl)}
                    aria-label={`Use imported image ${index + 1}`}
                  >
                    <img
                      src={imageUrl}
                      alt=""
                      aria-hidden="true"
                      className={styles.imagePickerThumbImage}
                    />
                    <span className={styles.imagePickerThumbLabel}>{getImageOptionLabel(index)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </dialog>
      ) : null}

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
