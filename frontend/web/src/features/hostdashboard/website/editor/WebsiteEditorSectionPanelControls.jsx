import React from "react";
import PropTypes from "prop-types";
import { ContactColorField } from "./WebsiteEditorFields";
import { WebsiteEditorVisibilityToggleCard } from "./WebsiteEditorVisibilityToggleCard";
import styles from "../WebsiteEditorPage.module.scss";

export function WebsiteEditorSectionPanelControls({
  activatePreviewTarget,
  clearActivePreviewTarget,
  colorField,
  commitPanelColorInput,
  handlePanelColorChange,
  handlePanelColorInputChange,
  handlePanelColorInputKeyDown,
  handlePanelToggleChange,
  highlightedTargetId,
  inputIdPrefix,
  panelTargetId,
  setTargetRef,
  showPanel,
  toggleFields = [],
}) {
  if (toggleFields.length < 1) {
    return null;
  }

  return (
    <>
      <div className={styles.toggleStack}>
        {toggleFields.map((field) => (
          <WebsiteEditorVisibilityToggleCard
            key={field.key}
            targetRef={setTargetRef(panelTargetId)}
            field={field}
            inputId={`${inputIdPrefix}-${field.key}`}
            labelId={`${inputIdPrefix}-${field.key}-label`}
            descriptionId={`${inputIdPrefix}-${field.key}-description`}
            checked={showPanel}
            onChange={handlePanelToggleChange}
            isHighlighted={highlightedTargetId === panelTargetId}
          />
        ))}
      </div>

      {showPanel ? (
        <ContactColorField
          label={colorField.label}
          hint={colorField.hint}
          value={colorField.value}
          placeholder={colorField.placeholder}
          resolveColorValue={colorField.resolveColorValue}
          inputAriaLabel={colorField.inputAriaLabel}
          onSelectColor={handlePanelColorChange}
          onChangeInput={handlePanelColorInputChange}
          onCommitInput={commitPanelColorInput}
          onInputKeyDown={handlePanelColorInputKeyDown}
          onFocus={activatePreviewTarget(colorField.previewTargetId || panelTargetId)}
          onBlur={clearActivePreviewTarget}
        />
      ) : null}
    </>
  );
}

WebsiteEditorSectionPanelControls.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  clearActivePreviewTarget: PropTypes.func.isRequired,
  colorField: PropTypes.shape({
    hint: PropTypes.string.isRequired,
    inputAriaLabel: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    placeholder: PropTypes.string.isRequired,
    previewTargetId: PropTypes.string,
    resolveColorValue: PropTypes.func.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
  commitPanelColorInput: PropTypes.func.isRequired,
  handlePanelColorChange: PropTypes.func.isRequired,
  handlePanelColorInputChange: PropTypes.func.isRequired,
  handlePanelColorInputKeyDown: PropTypes.func.isRequired,
  handlePanelToggleChange: PropTypes.func.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  inputIdPrefix: PropTypes.string.isRequired,
  panelTargetId: PropTypes.string.isRequired,
  setTargetRef: PropTypes.func.isRequired,
  showPanel: PropTypes.bool.isRequired,
  toggleFields: PropTypes.arrayOf(
    PropTypes.shape({
      description: PropTypes.string,
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
};
