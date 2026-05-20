import React from "react";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import PropTypes from "prop-types";
import { CollapsibleSection } from "../WebsiteEditorFields";
import { getImageSlotTargetId } from "../../websiteEditorConfig";
import { getImageOptionLabel, getSelectedImageForSlot } from "../websiteEditorUtils";
import styles from "../../WebsiteEditorPage.module.scss";

export function WebsiteEditorImageSlotsSection({
  editorValues,
  highlightedTargetId,
  imageSlots,
  importedImageOptions,
  isOpen,
  onOpenImagePicker,
  onToggle,
  sectionRef,
  setTargetRef,
}) {
  if (imageSlots.length < 1) {
    return null;
  }

  return (
    <CollapsibleSection
      sectionId="images"
      title="Image slots"
      description="Reassign imported listing images to the key visual slots used by this template."
      isOpen={isOpen}
      onToggle={onToggle}
      sectionRef={sectionRef}
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
              className={`${styles.imageSlotCard} ${
                isImageSlotHighlighted ? styles.editorTargetHighlighted : ""
              }`.trim()}
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
                  onClick={() => onOpenImagePicker(slot)}
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
  );
}

WebsiteEditorImageSlotsSection.propTypes = {
  editorValues: PropTypes.shape({
    images: PropTypes.shape({
      heroImage: PropTypes.string,
      residenceImage: PropTypes.string,
      gallery: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
  }).isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  imageSlots: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      kind: PropTypes.string.isRequired,
      index: PropTypes.number,
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })
  ).isRequired,
  importedImageOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onOpenImagePicker: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  sectionRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  setTargetRef: PropTypes.func.isRequired,
};
