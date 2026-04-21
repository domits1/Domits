import React, { useEffect, useMemo, useRef, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import KeyboardArrowDownOutlinedIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import PropTypes from "prop-types";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteDraftByPropertyId, upsertWebsiteDraft } from "./services/websiteDraftService";
import { fetchWebsitePropertyDetails } from "./services/websitePropertyService";
import { buildWebsiteTemplateModel } from "./rendering/buildWebsiteTemplateModel";
import WebsiteTemplatePreview from "./rendering/WebsiteTemplatePreview";
import {
  applyWebsiteDraftContentOverrides,
  buildWebsiteDraftEditorValues,
  buildWebsiteDraftOverridePatch,
  createEmptyWebsiteDraftEditorValues,
  mergeWebsiteDraftContentOverrides,
} from "./rendering/websiteDraftContentOverrides";
import { getWebsiteTemplateById } from "./websiteTemplates";
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
import styles from "./WebsiteEditorPage.module.scss";

const getImageOptionLabel = (index) => `Imported image ${index + 1}`;

const getSelectedImageForSlot = (slot, editorValues) =>
  slot.kind === "hero" ? editorValues.images.heroImage : editorValues.images.gallery[slot.index] || "";

const buildWebsitePreviewPath = (draftId) => `/website-preview/${encodeURIComponent(draftId)}`;

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

const getViewportHeight = () => {
  const viewportHeight = globalThis.innerHeight || globalThis.document?.documentElement?.clientHeight || 0;
  return Math.max(0, viewportHeight);
};

const getCenteredScrollTop = (node) => {
  if (!node || typeof node.getBoundingClientRect !== "function") {
    return null;
  }

  const viewportHeight = getViewportHeight();
  if (viewportHeight < 1) {
    return null;
  }

  const currentScrollTop = globalThis.scrollY || globalThis.pageYOffset || 0;
  const nodeRect = node.getBoundingClientRect();
  const centeredTop = currentScrollTop + nodeRect.top - viewportHeight / 2 + nodeRect.height / 2;
  return Math.max(0, Math.round(centeredTop));
};

const fieldPropTypes = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  component: PropTypes.oneOf(["input", "textarea"]).isRequired,
});

function TextField({ field, value, onChange, fieldRef, isHighlighted, onFocus, onBlur }) {
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
};

TextField.defaultProps = {
  fieldRef: null,
  isHighlighted: false,
  onFocus: undefined,
  onBlur: undefined,
};

function CollapsibleSection({
  sectionId,
  title,
  description,
  isOpen,
  onToggle,
  sectionRef,
  children,
}) {
  return (
    <section
      ref={sectionRef}
      className={styles.panelSection}
    >
      <button
        type="button"
        className={`${styles.sectionToggle} ${isOpen ? styles.sectionToggleOpen : ""}`.trim()}
        onClick={() => onToggle(sectionId)}
        aria-expanded={isOpen}
      >
        <div className={styles.sectionBlockHeader}>
          <h3 className={styles.sectionBlockTitle}>{title}</h3>
          <p className={styles.sectionBlockDescription}>{description}</p>
        </div>
        <KeyboardArrowDownOutlinedIcon className={styles.sectionToggleIcon} />
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

CollapsibleSection.defaultProps = {
  sectionRef: null,
};

function WebsiteEditorPage() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [draftRecord, setDraftRecord] = useState(null);
  const [baseModel, setBaseModel] = useState(null);
  const [editorValues, setEditorValues] = useState(createEmptyWebsiteDraftEditorValues);
  const [previewViewport, setPreviewViewport] = useState("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [highlightedTargetId, setHighlightedTargetId] = useState("");
  const [activePreviewTargetId, setActivePreviewTargetId] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    [EDITOR_SECTION_KEYS.common]: true,
    [EDITOR_SECTION_KEYS.visibility]: false,
    [EDITOR_SECTION_KEYS.images]: false,
    [EDITOR_SECTION_KEYS.trustCards]: false,
    [EDITOR_SECTION_KEYS.journeyStops]: false,
  });
  const [imagePickerState, setImagePickerState] = useState({
    isOpen: false,
    slot: null,
  });
  const sectionRefs = useRef({});
  const targetRefs = useRef({});
  const sectionHighlightResetTimeoutRef = useRef(null);

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
        const nextPreviewModel = applyWebsiteDraftContentOverrides(
          nextBaseModel,
          draft.contentOverrides || {}
        );

        if (!isMounted) {
          return;
        }

        setDraftRecord(draft);
        setBaseModel(nextBaseModel);
        setEditorValues(buildWebsiteDraftEditorValues(nextPreviewModel));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDraftRecord(null);
        setBaseModel(null);
        setEditorValues(createEmptyWebsiteDraftEditorValues());
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
    () => mergeWebsiteDraftContentOverrides(draftRecord?.contentOverrides || {}, contentOverridePatch),
    [contentOverridePatch, draftRecord]
  );

  const previewModel = useMemo(() => {
    if (!baseModel) {
      return null;
    }

    return applyWebsiteDraftContentOverrides(baseModel, mergedContentOverrides);
  }, [baseModel, mergedContentOverrides]);

  const hasUnsavedChanges = useMemo(() => {
    const persistedOverrides = draftRecord?.contentOverrides || {};
    return JSON.stringify(mergedContentOverrides) !== JSON.stringify(persistedOverrides);
  }, [draftRecord, mergedContentOverrides]);

  useEffect(() => {
    setExpandedSections({
      [EDITOR_SECTION_KEYS.common]: true,
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

    globalThis.setTimeout(() => {
      const targetEditorNode =
        resolveSectionNode(targetRefs.current[resolvedTargetId]) ||
        resolveSectionNode(sectionRefs.current[sectionId]);

      const centeredScrollTop = getCenteredScrollTop(targetEditorNode);
      if (centeredScrollTop !== null) {
        globalThis.scrollTo({
          top: centeredScrollTop,
          behavior: "smooth",
        });
        return;
      }

      targetEditorNode?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 120);
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
    setActivePreviewTargetId(EDITOR_TARGET_KEYS.common[fieldKey] || "");
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        [fieldKey]: nextValue,
      },
    }));
  };

  const activatePreviewTarget = (targetId) => () => {
    setActivePreviewTargetId(targetId);
  };

  const clearActivePreviewTarget = () => {
    setActivePreviewTargetId("");
  };

  const handleVisibilityFieldChange = (fieldKey) => (event) => {
    const nextChecked = event.target.checked;
    setEditorValues((currentValues) => ({
      ...currentValues,
      visibility: {
        ...currentValues.visibility,
        [fieldKey]: nextChecked,
      },
    }));
  };

  const updateImageSlotSelection = (slot, nextValue) => {
    if (!slot) {
      return;
    }

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

  const handleCollectionFieldChange = (collectionKey, itemIndex, fieldKey) => (event) => {
    const nextValue = event.target.value;
    const targetId = getCollectionTargetId(collectionKey, itemIndex);

    setActivePreviewTargetId(targetId);
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
        themeOverrides: draftRecord.themeOverrides || {},
      });

      const persistedDraft = await fetchWebsiteDraftByPropertyId(draftRecord.propertyId);
      if (!persistedDraft) {
        throw new Error("Draft save completed, but the updated draft could not be reloaded.");
      }

      setDraftRecord(persistedDraft);
      toast.success("Draft changes saved.");
    } catch (error) {
      toast.error(error?.message || "We could not save your website changes.");
    } finally {
      setIsSaving(false);
    }
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
    if (!imagePickerState.isOpen) {
      return undefined;
    }

    const documentBody = globalThis.document?.body;
    const previousOverflow = documentBody?.style.overflow ?? "";
    if (documentBody) {
      documentBody.style.overflow = "hidden";
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
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
  }, [imagePickerState.isOpen]);

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
              <aside className={styles.editorPanel}>
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
            </div>
          </div>

          <div className={styles.surface}>
            <aside className={styles.editorPanel}>
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
                        fieldRef={setTargetRef(EDITOR_TARGET_KEYS.common[field.key])}
                        isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.common[field.key]}
                        onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.common[field.key])}
                        onBlur={clearActivePreviewTarget}
                      />
                    ))}
                  </div>
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
                        const labelId = `website-editor-visibility-${field.key}-label`;
                        const descriptionId = `website-editor-visibility-${field.key}-description`;

                        return (
                          <div
                            key={field.key}
                            ref={setTargetRef(visibilityTargetId)}
                            className={`${styles.toggleCard} ${
                              highlightedTargetId === visibilityTargetId ? styles.editorTargetHighlighted : ""
                            }`.trim()}
                          >
                            <div className={styles.toggleCopy}>
                              <span id={labelId} className={styles.toggleLabel}>{field.label}</span>
                              <span id={descriptionId} className={styles.toggleDescription}>{field.description}</span>
                            </div>
                            <input
                              type="checkbox"
                              className={styles.toggleInput}
                              checked={Boolean(editorValues.visibility[field.key])}
                              onChange={handleVisibilityFieldChange(field.key)}
                              aria-labelledby={labelId}
                              aria-describedby={descriptionId}
                            />
                          </div>
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
                            <TextField
                              field={{ key: `trust-card-title-${index}`, label: "Title", component: "input" }}
                              value={card.title}
                              onChange={handleCollectionFieldChange("trustCards", index, "title")}
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
                              onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.journeyStops(index))}
                              onBlur={clearActivePreviewTarget}
                            />
                          </div>
                        ))}
                    </div>
                  </CollapsibleSection>
                ) : null}

                <p className={styles.helperText}>
                  Emptying a text field falls back to the imported listing value instead of forcing blank
                  output.
                </p>

                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void saveDraftChanges()}
                    disabled={isSaving || !hasUnsavedChanges}
                  >
                    <SaveOutlinedIcon fontSize="small" />
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
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
          onClick={(event) => {
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
                    key={`${imagePickerState.slot.label}-${imageUrl}`}
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
    </main>
  );
}

export default WebsiteEditorPage;

