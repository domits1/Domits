import React, { useEffect, useMemo, useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import TabletMacOutlinedIcon from "@mui/icons-material/TabletMacOutlined";
import SmartphoneOutlinedIcon from "@mui/icons-material/SmartphoneOutlined";
import PropTypes from "prop-types";
import { useNavigate, useParams } from "react-router-dom";
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
import styles from "./WebsiteEditorPage.module.scss";

const PREVIEW_VIEWPORT_OPTIONS = Object.freeze([
  { id: "desktop", label: "Desktop", Icon: LaptopMacOutlinedIcon },
  { id: "tablet", label: "Tablet", Icon: TabletMacOutlinedIcon },
  { id: "mobile", label: "Mobile", Icon: SmartphoneOutlinedIcon },
]);

const COMMON_TEXT_FIELDS = Object.freeze([
  {
    key: "siteTitle",
    label: "Website title",
    component: "input",
  },
  {
    key: "heroEyebrow",
    label: "Hero eyebrow",
    component: "input",
  },
  {
    key: "heroTitle",
    label: "Hero title",
    component: "input",
  },
  {
    key: "heroDescription",
    label: "Hero description",
    component: "textarea",
  },
  {
    key: "ctaLabel",
    label: "CTA label",
    component: "input",
  },
  {
    key: "ctaNote",
    label: "CTA note",
    component: "textarea",
  },
]);

const TEMPLATE_VISIBILITY_FIELD_MAP = Object.freeze({
  "panorama-landing": [
    {
      key: "topBar",
      label: "Show top bar",
      description: "Keep or hide the navigation strip at the top of the page.",
    },
    {
      key: "callToAction",
      label: "Show booking prompt",
      description: "Controls the booking CTA pill below the hero image.",
    },
    {
      key: "trustCards",
      label: "Show trust cards",
      description: "Controls the three quick-scan feature cards below the hero.",
    },
    {
      key: "gallerySection",
      label: "Show gallery section",
      description: "Controls the imported photo strip in the lower content block.",
    },
    {
      key: "amenitiesPanel",
      label: "Show amenities panel",
      description: "Controls the featured amenities panel in the lower content block.",
    },
  ],
  "trust-signals": [
    {
      key: "topBar",
      label: "Show top bar",
      description: "Keep or hide the compact website bar at the top.",
    },
    {
      key: "trustCards",
      label: "Show reassurance cards",
      description: "Controls the stacked trust cards under the hero image.",
    },
    {
      key: "callToAction",
      label: "Show soft CTA",
      description: "Controls the soft callout at the bottom of the page.",
    },
  ],
  "experience-journey": [
    {
      key: "topBar",
      label: "Show top bar",
      description: "Keep or hide the navigation strip at the top of the page.",
    },
    {
      key: "journeyStops",
      label: "Show journey sections",
      description: "Controls the arrival, stay, and area narrative blocks.",
    },
    {
      key: "amenitiesPanel",
      label: "Show amenities recap",
      description: "Controls the featured amenities list in the footer block.",
    },
    {
      key: "callToAction",
      label: "Show next-step callout",
      description: "Controls the CTA callout in the footer block.",
    },
  ],
});

const TEMPLATE_IMAGE_SLOT_MAP = Object.freeze({
  "panorama-landing": [
    { kind: "hero", label: "Hero image", description: "Main visual used in the top hero section." },
    { kind: "gallery", index: 0, label: "Gallery slot 1", description: "First image in the lower gallery strip." },
    { kind: "gallery", index: 1, label: "Gallery slot 2", description: "Second image in the lower gallery strip." },
    { kind: "gallery", index: 2, label: "Gallery slot 3", description: "Third image in the lower gallery strip." },
  ],
  "trust-signals": [
    { kind: "hero", label: "Hero image", description: "Main image used in the trust-oriented layout." },
  ],
  "experience-journey": [
    { kind: "gallery", index: 0, label: "Journey image 1", description: "Visual used next to the first journey stop." },
    { kind: "gallery", index: 1, label: "Journey image 2", description: "Visual used next to the second journey stop." },
    { kind: "gallery", index: 2, label: "Journey image 3", description: "Visual used next to the third journey stop." },
  ],
});

const TEMPLATE_COPY_COLLECTION_CONFIG = Object.freeze({
  "panorama-landing": {
    trustCards: {
      title: "Quick-scan cards",
      description: "These cards drive the fast-scan content block directly below the hero.",
      itemLabel: "Card",
      count: 3,
    },
  },
  "trust-signals": {
    trustCards: {
      title: "Trust cards",
      description: "These cards control the reassurance stack in the trust layout.",
      itemLabel: "Card",
      count: 2,
    },
  },
  "experience-journey": {
    journeyStops: {
      title: "Journey sections",
      description: "These stops control the step-by-step narrative in the experience layout.",
      itemLabel: "Stop",
      count: 3,
    },
  },
});

const getImageOptionLabel = (imageUrl, index) => `Imported image ${index + 1}`;

const fieldPropTypes = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  component: PropTypes.oneOf(["input", "textarea"]).isRequired,
});

function TextField({ field, value, onChange }) {
  if (field.component === "textarea") {
    return (
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
          {field.label}
        </label>
        <textarea
          id={`website-editor-${field.key}`}
          className={styles.textArea}
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
        {field.label}
      </label>
      <input
        id={`website-editor-${field.key}`}
        className={styles.textInput}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

TextField.propTypes = {
  field: fieldPropTypes.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
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
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadEditorState = async () => {
      setIsLoading(true);
      setLoadError("");
      setSaveMessage("");
      setSaveError("");

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
  const importedImageOptions = Array.isArray(baseModel?.media?.galleryImages) ? baseModel.media.galleryImages : [];

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

  const handleCommonFieldChange = (fieldKey) => (event) => {
    const nextValue = event.target.value;
    setEditorValues((currentValues) => ({
      ...currentValues,
      common: {
        ...currentValues.common,
        [fieldKey]: nextValue,
      },
    }));
    setSaveMessage("");
    setSaveError("");
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
    setSaveMessage("");
    setSaveError("");
  };

  const handleHeroImageChange = (event) => {
    const nextValue = event.target.value;
    setEditorValues((currentValues) => ({
      ...currentValues,
      images: {
        ...currentValues.images,
        heroImage: nextValue,
      },
    }));
    setSaveMessage("");
    setSaveError("");
  };

  const handleGalleryImageChange = (index) => (event) => {
    const nextValue = event.target.value;
    setEditorValues((currentValues) => {
      const nextGalleryValues = [...currentValues.images.gallery];
      nextGalleryValues[index] = nextValue;

      return {
        ...currentValues,
        images: {
          ...currentValues.images,
          gallery: nextGalleryValues,
        },
      };
    });
    setSaveMessage("");
    setSaveError("");
  };

  const handleCollectionFieldChange = (collectionKey, itemIndex, fieldKey) => (event) => {
    const nextValue = event.target.value;
    setEditorValues((currentValues) => {
      const nextCollection = [...currentValues[collectionKey]];
      nextCollection[itemIndex] = {
        ...(nextCollection[itemIndex] || {}),
        [fieldKey]: nextValue,
      };

      return {
        ...currentValues,
        [collectionKey]: nextCollection,
      };
    });
    setSaveMessage("");
    setSaveError("");
  };

  const saveDraftChanges = async () => {
    if (!draftRecord || !hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const nextDraft = await upsertWebsiteDraft({
        propertyId: draftRecord.propertyId,
        templateKey: draftRecord.templateKey,
        status: draftRecord.status || "DRAFT",
        contentOverrides: mergedContentOverrides,
        themeOverrides: draftRecord.themeOverrides || {},
      });

      setDraftRecord(nextDraft);
      setSaveMessage("Draft changes saved.");
    } catch (error) {
      setSaveError(error?.message || "We could not save your website changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="page-Host">
        <div className="page-Host-content">
          <section className={styles.editorPage}>
            <div className={styles.stateCard}>
              <PulseBarsLoader message="Opening your website editor..." />
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
            </div>
          </div>

          <div className={styles.surface}>
            <aside className={styles.editorPanel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Editable content</h2>
                <p className={styles.panelDescription}>
                  Keep the override surface controlled. Text, visibility, and image slots are enough for
                  this phase; free-form builder behavior is not.
                </p>
              </div>

              <div className={styles.editorForm}>
                <section className={styles.panelSection}>
                  <div className={styles.sectionBlockHeader}>
                    <h3 className={styles.sectionBlockTitle}>Common content</h3>
                    <p className={styles.sectionBlockDescription}>
                      Shared copy fields that affect the rendered website directly.
                    </p>
                  </div>

                  <div className={styles.fieldStack}>
                    {COMMON_TEXT_FIELDS.map((field) => (
                      <TextField
                        key={field.key}
                        field={field}
                        value={editorValues.common[field.key]}
                        onChange={handleCommonFieldChange(field.key)}
                      />
                    ))}
                  </div>
                </section>

                {visibilityFields.length > 0 ? (
                  <section className={styles.panelSection}>
                    <div className={styles.sectionBlockHeader}>
                      <h3 className={styles.sectionBlockTitle}>Section visibility</h3>
                      <p className={styles.sectionBlockDescription}>
                        Toggle major sections without changing the underlying draft data.
                      </p>
                    </div>

                    <div className={styles.toggleStack}>
                      {visibilityFields.map((field) => (
                        <label key={field.key} className={styles.toggleCard}>
                          <div className={styles.toggleCopy}>
                            <span className={styles.toggleLabel}>{field.label}</span>
                            <span className={styles.toggleDescription}>{field.description}</span>
                          </div>
                          <input
                            type="checkbox"
                            className={styles.toggleInput}
                            checked={Boolean(editorValues.visibility[field.key])}
                            onChange={handleVisibilityFieldChange(field.key)}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                {imageSlots.length > 0 ? (
                  <section className={styles.panelSection}>
                    <div className={styles.sectionBlockHeader}>
                      <h3 className={styles.sectionBlockTitle}>Image slots</h3>
                      <p className={styles.sectionBlockDescription}>
                        Reassign imported listing images to the key visual slots used by this template.
                      </p>
                    </div>

                    <div className={styles.imageSlotGrid}>
                      {imageSlots.map((slot) => {
                        const selectedImageUrl =
                          slot.kind === "hero"
                            ? editorValues.images.heroImage
                            : editorValues.images.gallery[slot.index] || "";

                        return (
                          <div
                            key={`${slot.kind}-${slot.index ?? "hero"}`}
                            className={styles.imageSlotCard}
                          >
                            <div className={styles.imageSlotPreview}>
                              {selectedImageUrl ? (
                                <img src={selectedImageUrl} alt={slot.label} className={styles.imageSlotPreviewImage} />
                              ) : (
                                <span className={styles.imageSlotPreviewEmpty}>No image selected</span>
                              )}
                            </div>

                            <div className={styles.fieldGroup}>
                              <label
                                className={styles.fieldLabel}
                                htmlFor={`website-editor-image-${slot.kind}-${slot.index ?? "hero"}`}
                              >
                                {slot.label}
                              </label>
                              <select
                                id={`website-editor-image-${slot.kind}-${slot.index ?? "hero"}`}
                                className={styles.selectInput}
                                value={selectedImageUrl}
                                onChange={slot.kind === "hero" ? handleHeroImageChange : handleGalleryImageChange(slot.index)}
                              >
                                {importedImageOptions.map((imageUrl, index) => (
                                  <option key={`${slot.label}-${imageUrl}-${index}`} value={imageUrl}>
                                    {getImageOptionLabel(imageUrl, index)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <p className={styles.helperText}>{slot.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {copyCollectionConfig.trustCards ? (
                  <section className={styles.panelSection}>
                    <div className={styles.sectionBlockHeader}>
                      <h3 className={styles.sectionBlockTitle}>{copyCollectionConfig.trustCards.title}</h3>
                      <p className={styles.sectionBlockDescription}>
                        {copyCollectionConfig.trustCards.description}
                      </p>
                    </div>

                    <div className={styles.collectionStack}>
                      {editorValues.trustCards
                        .slice(0, copyCollectionConfig.trustCards.count)
                        .map((card, index) => (
                          <div key={`trust-card-${index}`} className={styles.collectionCard}>
                            <p className={styles.collectionTitle}>
                              {copyCollectionConfig.trustCards.itemLabel} {index + 1}
                            </p>
                            <TextField
                              field={{ key: `trust-card-title-${index}`, label: "Title", component: "input" }}
                              value={card.title}
                              onChange={handleCollectionFieldChange("trustCards", index, "title")}
                            />
                            <TextField
                              field={{
                                key: `trust-card-description-${index}`,
                                label: "Description",
                                component: "textarea",
                              }}
                              value={card.description}
                              onChange={handleCollectionFieldChange("trustCards", index, "description")}
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                ) : null}

                {copyCollectionConfig.journeyStops ? (
                  <section className={styles.panelSection}>
                    <div className={styles.sectionBlockHeader}>
                      <h3 className={styles.sectionBlockTitle}>{copyCollectionConfig.journeyStops.title}</h3>
                      <p className={styles.sectionBlockDescription}>
                        {copyCollectionConfig.journeyStops.description}
                      </p>
                    </div>

                    <div className={styles.collectionStack}>
                      {editorValues.journeyStops
                        .slice(0, copyCollectionConfig.journeyStops.count)
                        .map((stop, index) => (
                          <div key={`journey-stop-${index}`} className={styles.collectionCard}>
                            <p className={styles.collectionTitle}>
                              {copyCollectionConfig.journeyStops.itemLabel} {index + 1}
                            </p>
                            <TextField
                              field={{ key: `journey-stop-title-${index}`, label: "Title", component: "input" }}
                              value={stop.title}
                              onChange={handleCollectionFieldChange("journeyStops", index, "title")}
                            />
                            <TextField
                              field={{
                                key: `journey-stop-description-${index}`,
                                label: "Description",
                                component: "textarea",
                              }}
                              value={stop.description}
                              onChange={handleCollectionFieldChange("journeyStops", index, "description")}
                            />
                          </div>
                        ))}
                    </div>
                  </section>
                ) : null}

                <p className={styles.helperText}>
                  Emptying a text field falls back to the imported listing value instead of forcing blank
                  output.
                </p>

                {saveMessage ? <p className={styles.successText}>{saveMessage}</p> : null}
                {saveError ? <p className={styles.errorText}>{saveError}</p> : null}

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
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Live preview</h2>
                <p className={styles.panelDescription}>
                  The preview now scales inside the available viewport. Switch device widths here instead
                  of hoping random browser width changes tell you enough.
                </p>
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

              <WebsiteTemplatePreview
                templateId={draftRecord.templateKey}
                model={previewModel}
                viewport={previewViewport}
              />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export default WebsiteEditorPage;

