import React from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import PropTypes from "prop-types";
import {
  AmenityIconSelectField,
  CollapsibleSection,
  ContactColorField,
  TextField,
} from "../WebsiteEditorFields";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS } from "../../websiteEditorConfig";
import {
  getDefaultWebsiteAmenityIconColor,
  resolveWebsiteAmenityIconColor,
} from "../../config/websiteAmenitiesConfig";
import styles from "../../WebsiteEditorPage.module.scss";

export function WebsiteEditorAmenitiesSection({
  activatePreviewTarget,
  addAmenityItem,
  amenitiesConfig,
  amenitiesVisibilityContent = null,
  canAddAmenity,
  clearActivePreviewTarget,
  commitAmenitiesIconColorInput,
  draftTemplateKey,
  editorValues,
  handleAmenitiesIconColorChange,
  handleAmenitiesIconColorInputChange,
  handleAmenitiesIconColorInputKeyDown,
  handleCollectionFieldChange,
  handleEditorFieldKeyDown,
  highlightedTargetId,
  isOpen,
  moveAmenityItemDown,
  moveAmenityItemUp,
  onOpenIconPicker,
  removeAmenityItem,
  sectionRef,
  setTargetRef,
  toggleSection,
}) {
  if (!amenitiesConfig) {
    return null;
  }

  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.amenities}
      title={amenitiesConfig.title}
      description={amenitiesConfig.description}
      isOpen={isOpen}
      onToggle={toggleSection}
      sectionRef={sectionRef}
    >
      {amenitiesVisibilityContent ? <div className={styles.toggleStack}>{amenitiesVisibilityContent}</div> : null}

      <ContactColorField
        label="Icon color"
        hint="Controls the amenity icon color in the featured section and full list."
        value={editorValues.amenitiesIconColor}
        placeholder={getDefaultWebsiteAmenityIconColor(draftTemplateKey)}
        resolveColorValue={(value) => resolveWebsiteAmenityIconColor(value, draftTemplateKey)}
        inputAriaLabel="Amenities icon color"
        onSelectColor={handleAmenitiesIconColorChange}
        onChangeInput={handleAmenitiesIconColorInputChange}
        onCommitInput={commitAmenitiesIconColorInput}
        onInputKeyDown={handleAmenitiesIconColorInputKeyDown}
        fieldRef={setTargetRef(EDITOR_TARGET_KEYS.amenitiesIconColor)}
        isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.amenitiesIconColor}
        onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.visibility("amenitiesPanel"))}
        onBlur={clearActivePreviewTarget}
      />

      <div className={styles.collectionStack}>
        {editorValues.amenities.map((amenity, index) => {
          const amenityTargetId = EDITOR_TARGET_KEYS.amenities(index);
          const amenityDeleteSubject = amenity.label || `amenity ${index + 1}`;
          const amenityDeleteButtonLabel = `Delete ${amenityDeleteSubject}`;

          return (
            <div
              key={amenity.id}
              ref={setTargetRef(amenityTargetId)}
              className={`${styles.collectionCard} ${
                highlightedTargetId === amenityTargetId ? styles.editorTargetHighlighted : ""
              }`.trim()}
            >
              <p className={styles.collectionTitle}>
                {amenitiesConfig.itemLabel} {index + 1}
              </p>
              {amenitiesConfig.supportsIconSelection ? (
                <AmenityIconSelectField
                  fieldKey={`amenity-icon-${index}`}
                  label={`${amenitiesConfig.itemLabel} ${index + 1}`}
                  value={amenity.iconAmenityId || amenity.id || ""}
                  onOpenPicker={() =>
                    onOpenIconPicker(
                      EDITOR_SECTION_KEYS.amenities,
                      index,
                      `${amenitiesConfig.itemLabel} ${index + 1} icon`
                    )
                  }
                  onFocus={activatePreviewTarget(amenityTargetId)}
                  onBlur={clearActivePreviewTarget}
                />
              ) : null}
              <TextField
                field={{ key: `amenity-label-${index}`, label: "Name", component: "input" }}
                value={amenity.label}
                onChange={handleCollectionFieldChange(EDITOR_SECTION_KEYS.amenities, index, "label")}
                onKeyDown={handleEditorFieldKeyDown({ component: "input" })}
                onFocus={activatePreviewTarget(amenityTargetId)}
                onBlur={clearActivePreviewTarget}
              />
              <div className={styles.collectionActionRow}>
                <button
                  type="button"
                  className={`${styles.secondaryButton} ${styles.collectionActionButton} ${styles.collectionActionMoveButton}`.trim()}
                  onClick={() => moveAmenityItemUp(index)}
                  disabled={index < 1}
                  onFocus={activatePreviewTarget(amenityTargetId)}
                  onBlur={clearActivePreviewTarget}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className={`${styles.secondaryButton} ${styles.collectionActionButton} ${styles.collectionActionMoveButton}`.trim()}
                  onClick={() => moveAmenityItemDown(index)}
                  disabled={index >= editorValues.amenities.length - 1}
                  onFocus={activatePreviewTarget(amenityTargetId)}
                  onBlur={clearActivePreviewTarget}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className={`${styles.secondaryButton} ${styles.collectionActionButton} ${styles.collectionActionDeleteButton}`.trim()}
                  onClick={() => removeAmenityItem(index)}
                  aria-label={amenityDeleteButtonLabel}
                  title={amenityDeleteButtonLabel}
                  onFocus={activatePreviewTarget(amenityTargetId)}
                  onBlur={clearActivePreviewTarget}
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.collectionSectionFooter}>
        <p className={styles.helperText}>
          Up to {amenitiesConfig.maxCount} amenities can be configured here. Their order controls which ones appear first on the website.
        </p>
        {canAddAmenity ? (
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.collectionAddButton}`.trim()}
            onClick={addAmenityItem}
          >
            + Add amenity
          </button>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}

WebsiteEditorAmenitiesSection.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  addAmenityItem: PropTypes.func.isRequired,
  amenitiesConfig: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    itemLabel: PropTypes.string.isRequired,
    maxCount: PropTypes.number.isRequired,
    supportsIconSelection: PropTypes.bool,
  }),
  amenitiesVisibilityContent: PropTypes.node,
  canAddAmenity: PropTypes.bool.isRequired,
  clearActivePreviewTarget: PropTypes.func.isRequired,
  commitAmenitiesIconColorInput: PropTypes.func.isRequired,
  draftTemplateKey: PropTypes.string.isRequired,
  editorValues: PropTypes.shape({
    amenitiesIconColor: PropTypes.string.isRequired,
    amenities: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        iconAmenityId: PropTypes.string,
        label: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  handleAmenitiesIconColorChange: PropTypes.func.isRequired,
  handleAmenitiesIconColorInputChange: PropTypes.func.isRequired,
  handleAmenitiesIconColorInputKeyDown: PropTypes.func.isRequired,
  handleCollectionFieldChange: PropTypes.func.isRequired,
  handleEditorFieldKeyDown: PropTypes.func.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  moveAmenityItemDown: PropTypes.func.isRequired,
  moveAmenityItemUp: PropTypes.func.isRequired,
  onOpenIconPicker: PropTypes.func.isRequired,
  removeAmenityItem: PropTypes.func.isRequired,
  sectionRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  setTargetRef: PropTypes.func.isRequired,
  toggleSection: PropTypes.func.isRequired,
};
