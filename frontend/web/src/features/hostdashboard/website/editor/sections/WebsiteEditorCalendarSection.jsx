import React from "react";
import PropTypes from "prop-types";
import { getDefaultWebsiteCalendarPanelColor, resolveWebsiteCalendarPanelColor } from "../../config/websiteCalendarSectionConfig";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS } from "../../websiteEditorConfig";
import { ContactColorField, CollapsibleSection, TextField } from "../WebsiteEditorFields";
import { WebsiteEditorVisibilityToggleCard } from "../WebsiteEditorVisibilityToggleCard";
import styles from "../../WebsiteEditorPage.module.scss";

export function WebsiteEditorCalendarSection({
  activatePreviewTarget,
  calendarTextFields,
  calendarToggleFields,
  calendarVisibilityField,
  clearActivePreviewTarget,
  commitCalendarPanelColorInput,
  editorValues,
  handleCalendarFieldChange,
  handleEditorFieldKeyDown,
  handleCalendarPanelColorChange,
  handleCalendarPanelColorInputChange,
  handleCalendarPanelColorInputKeyDown,
  handleCalendarPanelToggleChange,
  handleVisibilityFieldChange,
  highlightedTargetId,
  isOpen,
  sectionRef,
  setTargetRef,
  templateKey,
  toggleSection,
}) {
  if (!calendarVisibilityField) {
    return null;
  }

  const showCalendarPanelColorField = editorValues.calendar.showPanel !== false;

  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.calendar}
      title="Calendar"
      description="Controls the visibility and framed surface around the availability section."
      isOpen={isOpen}
      onToggle={toggleSection}
      sectionRef={sectionRef}
    >
      <div className={styles.fieldStack}>
        {calendarTextFields.map((field) => {
          const targetId =
            field.key === "title" ? EDITOR_TARGET_KEYS.calendar.title : EDITOR_TARGET_KEYS.calendar.description;

          return (
            <TextField
              key={field.key}
              field={field}
              value={editorValues.calendar[field.key]}
              onChange={handleCalendarFieldChange(field.key)}
              onKeyDown={handleEditorFieldKeyDown(field)}
              fieldRef={setTargetRef(targetId)}
              isHighlighted={highlightedTargetId === targetId}
              onFocus={activatePreviewTarget(targetId)}
              onBlur={clearActivePreviewTarget}
            />
          );
        })}

        <div className={styles.toggleStack}>
          <WebsiteEditorVisibilityToggleCard
            targetRef={setTargetRef(EDITOR_TARGET_KEYS.calendar.visibility)}
            field={calendarVisibilityField}
            inputId="website-editor-calendar-visibility"
            labelId="website-editor-calendar-visibility-label"
            descriptionId="website-editor-calendar-visibility-description"
            checked={Boolean(editorValues.visibility.availabilityCalendar)}
            onChange={handleVisibilityFieldChange("availabilityCalendar")}
            isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.calendar.visibility}
          />
        </div>

        {calendarToggleFields.length > 0 ? (
          <div className={styles.toggleStack}>
            {calendarToggleFields.map((field) => (
              <WebsiteEditorVisibilityToggleCard
                key={field.key}
                targetRef={setTargetRef(EDITOR_TARGET_KEYS.calendar.showPanel)}
                field={field}
                inputId={`website-editor-calendar-${field.key}`}
                labelId={`website-editor-calendar-${field.key}-label`}
                descriptionId={`website-editor-calendar-${field.key}-description`}
                checked={editorValues.calendar.showPanel !== false}
                onChange={handleCalendarPanelToggleChange}
                isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.calendar.showPanel}
              />
            ))}
          </div>
        ) : null}

        {showCalendarPanelColorField ? (
          <ContactColorField
            label="Calendar panel color"
            hint="Controls the framed surface behind the availability calendar when the panel is enabled."
            value={editorValues.calendar.panelColor}
            placeholder={getDefaultWebsiteCalendarPanelColor(templateKey)}
            resolveColorValue={(value) => resolveWebsiteCalendarPanelColor(value, templateKey)}
            inputAriaLabel="Calendar panel color"
            onSelectColor={handleCalendarPanelColorChange}
            onChangeInput={handleCalendarPanelColorInputChange}
            onCommitInput={commitCalendarPanelColorInput}
            onInputKeyDown={handleCalendarPanelColorInputKeyDown}
            onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.calendar.visibility)}
            onBlur={clearActivePreviewTarget}
          />
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

WebsiteEditorCalendarSection.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  calendarTextFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      component: PropTypes.string.isRequired,
    })
  ).isRequired,
  calendarToggleFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      description: PropTypes.string,
    })
  ).isRequired,
  calendarVisibilityField: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
  }),
  clearActivePreviewTarget: PropTypes.func.isRequired,
  commitCalendarPanelColorInput: PropTypes.func.isRequired,
  editorValues: PropTypes.shape({
    calendar: PropTypes.shape({
      title: PropTypes.string,
      description: PropTypes.string,
      showPanel: PropTypes.bool,
      panelColor: PropTypes.string,
    }).isRequired,
    visibility: PropTypes.shape({
      availabilityCalendar: PropTypes.bool,
    }).isRequired,
  }).isRequired,
  handleCalendarFieldChange: PropTypes.func.isRequired,
  handleEditorFieldKeyDown: PropTypes.func.isRequired,
  handleCalendarPanelColorChange: PropTypes.func.isRequired,
  handleCalendarPanelColorInputChange: PropTypes.func.isRequired,
  handleCalendarPanelColorInputKeyDown: PropTypes.func.isRequired,
  handleCalendarPanelToggleChange: PropTypes.func.isRequired,
  handleVisibilityFieldChange: PropTypes.func.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
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
