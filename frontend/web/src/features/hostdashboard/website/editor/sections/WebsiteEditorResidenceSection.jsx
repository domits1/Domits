import React from "react";
import PropTypes from "prop-types";
import {
  DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR,
  resolveWebsiteResidencePanelColor,
} from "../../config/websiteResidenceSectionConfig";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS } from "../../websiteEditorConfig";
import { WebsiteEditorVisibilityToggleCard } from "../WebsiteEditorVisibilityToggleCard";
import { ContactColorField, CollapsibleSection, TextField } from "../WebsiteEditorFields";
import { WebsiteEditorImageSlotCard } from "../WebsiteEditorImageSlotCard";
import styles from "../../WebsiteEditorPage.module.scss";

const getResidenceTextTargetId = (fieldKey) => {
  if (fieldKey === "residenceTitle") {
    return EDITOR_TARGET_KEYS.residence.title;
  }

  if (fieldKey === "residenceHeadline") {
    return EDITOR_TARGET_KEYS.residence.headline;
  }

  return EDITOR_TARGET_KEYS.residence.description;
};

export function WebsiteEditorResidenceSection({
  activatePreviewTarget,
  clearActivePreviewTarget,
  commitResidencePanelColorInput,
  editorValues,
  handleCommonFieldChange,
  handleCommonToggleFieldChange,
  handleEditorFieldKeyDown,
  handleResidencePanelColorChange,
  handleResidencePanelColorInputChange,
  handleResidencePanelColorInputKeyDown,
  highlightedTargetId,
  importedImageOptions,
  isOpen,
  onChangeImageRotation,
  onOpenImagePicker,
  residenceImageSlot,
  residenceTextFields,
  residenceToggleFields,
  sectionRef,
  sectionTitle,
  setTargetRef,
  toggleSection,
}) {
  if (residenceTextFields.length < 1 && residenceToggleFields.length < 1 && !residenceImageSlot) {
    return null;
  }

  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.residence}
      title={sectionTitle}
      description="Controls the copy, lead image, and panel styling for this section."
      isOpen={isOpen}
      onToggle={toggleSection}
      sectionRef={sectionRef}
    >
      <div className={styles.fieldStack}>
        {residenceTextFields.map((field) => {
          const targetId = getResidenceTextTargetId(field.key);

          return (
            <TextField
              key={field.key}
              field={field}
              value={editorValues.common[field.key]}
              onChange={handleCommonFieldChange(field.key)}
              onKeyDown={handleEditorFieldKeyDown(field)}
              fieldRef={setTargetRef(targetId)}
              isHighlighted={highlightedTargetId === targetId}
              onFocus={activatePreviewTarget(targetId)}
              onBlur={clearActivePreviewTarget}
            />
          );
        })}

        {residenceToggleFields.length > 0 ? (
          <div className={styles.toggleStack}>
            {residenceToggleFields.map((field) => (
              <WebsiteEditorVisibilityToggleCard
                key={field.key}
                targetRef={setTargetRef(EDITOR_TARGET_KEYS.residence.showPanel)}
                field={field}
                inputId={`website-editor-residence-${field.key}`}
                labelId={`website-editor-residence-${field.key}-label`}
                descriptionId={`website-editor-residence-${field.key}-description`}
                checked={Boolean(editorValues.common[field.key])}
                onChange={handleCommonToggleFieldChange(field.key)}
                isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.residence.showPanel}
              />
            ))}
          </div>
        ) : null}

        {editorValues.common.residenceShowPanel ? (
          <ContactColorField
            label="Residence panel color"
            hint='Controls the white framed surface behind "The residence" when the panel is enabled.'
            value={editorValues.common.residencePanelColor}
            placeholder={DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR}
            resolveColorValue={resolveWebsiteResidencePanelColor}
            inputAriaLabel="Residence panel color"
            onSelectColor={handleResidencePanelColorChange}
            onChangeInput={handleResidencePanelColorInputChange}
            onCommitInput={commitResidencePanelColorInput}
            onInputKeyDown={handleResidencePanelColorInputKeyDown}
            onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.residence.showPanel)}
            onBlur={clearActivePreviewTarget}
          />
        ) : null}

        {residenceImageSlot ? (
          <WebsiteEditorImageSlotCard
            slot={residenceImageSlot}
            editorValues={editorValues}
            highlightedTargetId={highlightedTargetId}
            importedImageOptions={importedImageOptions}
            onChangeImageRotation={onChangeImageRotation}
            onOpenImagePicker={onOpenImagePicker}
            setTargetRef={setTargetRef}
          />
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

WebsiteEditorResidenceSection.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  clearActivePreviewTarget: PropTypes.func.isRequired,
  commitResidencePanelColorInput: PropTypes.func.isRequired,
  editorValues: PropTypes.shape({
    common: PropTypes.shape({
      heroDescription: PropTypes.string,
      residenceTitle: PropTypes.string,
      residenceHeadline: PropTypes.string,
      residenceShowPanel: PropTypes.bool,
      residencePanelColor: PropTypes.string,
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
  handleCommonFieldChange: PropTypes.func.isRequired,
  handleCommonToggleFieldChange: PropTypes.func.isRequired,
  handleEditorFieldKeyDown: PropTypes.func.isRequired,
  handleResidencePanelColorChange: PropTypes.func.isRequired,
  handleResidencePanelColorInputChange: PropTypes.func.isRequired,
  handleResidencePanelColorInputKeyDown: PropTypes.func.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  importedImageOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onChangeImageRotation: PropTypes.func.isRequired,
  onOpenImagePicker: PropTypes.func.isRequired,
  residenceImageSlot: PropTypes.shape({
    id: PropTypes.string.isRequired,
    kind: PropTypes.string.isRequired,
    index: PropTypes.number,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    supportsRotation: PropTypes.bool,
  }),
  residenceTextFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      component: PropTypes.string.isRequired,
    })
  ).isRequired,
  residenceToggleFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  sectionRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  sectionTitle: PropTypes.string.isRequired,
  setTargetRef: PropTypes.func.isRequired,
  toggleSection: PropTypes.func.isRequired,
};
