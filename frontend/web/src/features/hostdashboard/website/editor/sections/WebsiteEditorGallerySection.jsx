import React from "react";
import PropTypes from "prop-types";
import {
  getDefaultWebsiteGalleryPanelColor,
  resolveWebsiteGalleryPanelColor,
} from "../../config/websiteGallerySectionConfig";
import {
  EDITOR_SECTION_KEYS,
  EDITOR_TARGET_KEYS,
  getGalleryFieldPreviewTargetId,
} from "../../websiteEditorConfig";
import { CollapsibleSection, TextField } from "../WebsiteEditorFields";
import { WebsiteEditorVisibilityToggleCard } from "../WebsiteEditorVisibilityToggleCard";
import { WebsiteEditorImageSlotCard } from "../WebsiteEditorImageSlotCard";
import { WebsiteEditorSectionPanelControls } from "../WebsiteEditorSectionPanelControls";
import styles from "../../WebsiteEditorPage.module.scss";

export function WebsiteEditorGallerySection({
  activatePreviewTarget,
  clearActivePreviewTarget,
  commitGalleryPanelColorInput,
  editorValues,
  galleryImageSlots,
  galleryPanelToggleFields = [],
  galleryTextFields,
  galleryVisibilityField,
  handleEditorFieldKeyDown,
  handleGalleryPanelColorChange,
  handleGalleryPanelColorInputChange,
  handleGalleryPanelColorInputKeyDown,
  handleGalleryPanelToggleChange,
  handleGallerySectionFieldChange,
  handleVisibilityFieldChange,
  highlightedTargetId,
  importedImageOptions,
  isOpen,
  onChangeImageRotation,
  onOpenImagePicker,
  sectionRef,
  setTargetRef,
  templateKey,
  toggleSection,
}) {
  if (
    !galleryVisibilityField &&
    galleryTextFields.length < 1 &&
    galleryImageSlots.length < 1 &&
    galleryPanelToggleFields.length < 1
  ) {
    return null;
  }

  const showGalleryPanelColorField = editorValues.gallerySection.showPanel !== false;

  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.gallery}
      title="Gallery"
      description="Controls the Panorama gallery copy, panel styling, visibility, and visible grid images."
      isOpen={isOpen}
      onToggle={toggleSection}
      sectionRef={sectionRef}
    >
      <div className={styles.fieldStack}>
        {galleryTextFields.map((field) => {
          const targetId = getGalleryFieldPreviewTargetId(field.key);

          return (
            <TextField
              key={field.key}
              field={field}
              value={editorValues.gallerySection[field.key]}
              onChange={handleGallerySectionFieldChange(field.key)}
              onKeyDown={handleEditorFieldKeyDown(field)}
              fieldRef={setTargetRef(targetId)}
              isHighlighted={highlightedTargetId === targetId}
              onFocus={activatePreviewTarget(targetId)}
              onBlur={clearActivePreviewTarget}
            />
          );
        })}

        {galleryVisibilityField ? (
          <div className={styles.toggleStack}>
            <WebsiteEditorVisibilityToggleCard
              targetRef={setTargetRef(EDITOR_TARGET_KEYS.gallery.visibility)}
              field={galleryVisibilityField}
              inputId="website-editor-gallery-visibility"
              labelId="website-editor-gallery-visibility-label"
              descriptionId="website-editor-gallery-visibility-description"
              checked={Boolean(editorValues.visibility.gallerySection)}
              onChange={handleVisibilityFieldChange("gallerySection")}
              isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.gallery.visibility}
            />
          </div>
        ) : null}

        <WebsiteEditorSectionPanelControls
          activatePreviewTarget={activatePreviewTarget}
          clearActivePreviewTarget={clearActivePreviewTarget}
          colorField={{
            label: "Gallery panel color",
            hint: "Controls the framed surface behind the gallery section when the panel is enabled.",
            value: editorValues.gallerySection.panelColor,
            placeholder: getDefaultWebsiteGalleryPanelColor(templateKey),
            resolveColorValue: (value) => resolveWebsiteGalleryPanelColor(value, templateKey),
            inputAriaLabel: "Gallery panel color",
            previewTargetId: EDITOR_TARGET_KEYS.gallery.visibility,
          }}
          commitPanelColorInput={commitGalleryPanelColorInput}
          handlePanelColorChange={handleGalleryPanelColorChange}
          handlePanelColorInputChange={handleGalleryPanelColorInputChange}
          handlePanelColorInputKeyDown={handleGalleryPanelColorInputKeyDown}
          handlePanelToggleChange={handleGalleryPanelToggleChange}
          highlightedTargetId={highlightedTargetId}
          inputIdPrefix="website-editor-gallery-panel"
          panelTargetId={EDITOR_TARGET_KEYS.gallery.showPanel}
          setTargetRef={setTargetRef}
          showPanel={showGalleryPanelColorField}
          toggleFields={galleryPanelToggleFields}
        />

        {galleryImageSlots.length > 0 ? (
          <div className={styles.fieldStack}>
            {galleryImageSlots.map((slot) => (
              <WebsiteEditorImageSlotCard
                key={slot.id}
                editorValues={editorValues}
                highlightedTargetId={highlightedTargetId}
                importedImageOptions={importedImageOptions}
                onChangeImageRotation={onChangeImageRotation}
                onOpenImagePicker={onOpenImagePicker}
                setTargetRef={setTargetRef}
                slot={slot}
              />
            ))}
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

WebsiteEditorGallerySection.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  clearActivePreviewTarget: PropTypes.func.isRequired,
  editorValues: PropTypes.shape({
    gallerySection: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      browseLabel: PropTypes.string,
      showPanel: PropTypes.bool,
      panelColor: PropTypes.string,
    }).isRequired,
    visibility: PropTypes.shape({
      gallerySection: PropTypes.bool,
    }).isRequired,
    images: PropTypes.shape({
      heroImage: PropTypes.string,
      residenceImage: PropTypes.string,
      gallery: PropTypes.arrayOf(PropTypes.string),
      rotation: PropTypes.shape({
        hero: PropTypes.bool,
        residence: PropTypes.bool,
        gallery: PropTypes.arrayOf(PropTypes.bool),
      }),
    }).isRequired,
  }).isRequired,
  galleryImageSlots: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      kind: PropTypes.string.isRequired,
      index: PropTypes.number,
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      supportsRotation: PropTypes.bool,
    })
  ).isRequired,
  galleryPanelToggleFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  galleryTextFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      component: PropTypes.string.isRequired,
    })
  ).isRequired,
  galleryVisibilityField: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
  }),
  commitGalleryPanelColorInput: PropTypes.func.isRequired,
  handleEditorFieldKeyDown: PropTypes.func.isRequired,
  handleGalleryPanelColorChange: PropTypes.func.isRequired,
  handleGalleryPanelColorInputChange: PropTypes.func.isRequired,
  handleGalleryPanelColorInputKeyDown: PropTypes.func.isRequired,
  handleGalleryPanelToggleChange: PropTypes.func.isRequired,
  handleGallerySectionFieldChange: PropTypes.func.isRequired,
  handleVisibilityFieldChange: PropTypes.func.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  importedImageOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onChangeImageRotation: PropTypes.func.isRequired,
  onOpenImagePicker: PropTypes.func.isRequired,
  sectionRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  setTargetRef: PropTypes.func.isRequired,
  templateKey: PropTypes.string.isRequired,
  toggleSection: PropTypes.func.isRequired,
};
