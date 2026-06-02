import React from "react";
import CollectionsOutlinedIcon from "@mui/icons-material/CollectionsOutlined";
import PropTypes from "prop-types";
import { getImageSlotTargetId } from "../websiteEditorConfig";
import { getImageOptionLabel, getSelectedImageForSlot } from "./websiteEditorUtils";
import { getWebsiteImageSlotRotationEnabled } from "../rendering/websiteImageSlotUtils";
import styles from "../WebsiteEditorPage.module.scss";

export function WebsiteEditorImageSlotCard({
  editorValues,
  highlightedTargetId,
  importedImageOptions,
  onChangeImageRotation,
  onOpenImagePicker,
  setTargetRef,
  slot,
}) {
  const selectedImageUrl = getSelectedImageForSlot(slot, editorValues);
  const selectedImageIndex = importedImageOptions.indexOf(selectedImageUrl);
  const imageSlotTargetId = getImageSlotTargetId(slot);
  const isImageSlotHighlighted = highlightedTargetId === imageSlotTargetId;
  const isRotationEnabled = getWebsiteImageSlotRotationEnabled(slot, editorValues?.images?.rotation);
  let selectedImageLabel = "No imported image assigned";
  if (selectedImageIndex > -1) {
    selectedImageLabel = isRotationEnabled
      ? `${getImageOptionLabel(selectedImageIndex)} leads the rotation`
      : getImageOptionLabel(selectedImageIndex);
  }

  return (
    <div
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
        <div className={styles.imageSlotMetaHeader}>
          <div className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>{slot.label}</span>
            <span className={styles.helperText}>{selectedImageLabel}</span>
          </div>

          {slot.supportsRotation ? (
            <label className={styles.compactToggle}>
              <input
                type="checkbox"
                className={styles.compactToggleInput}
                checked={isRotationEnabled}
                onChange={(event) => onChangeImageRotation(slot, event.target.checked)}
              />
              <span className={styles.compactToggleLabel}>Rotate</span>
            </label>
          ) : null}
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
}

WebsiteEditorImageSlotCard.propTypes = {
  editorValues: PropTypes.shape({
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
  highlightedTargetId: PropTypes.string.isRequired,
  importedImageOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeImageRotation: PropTypes.func.isRequired,
  onOpenImagePicker: PropTypes.func.isRequired,
  setTargetRef: PropTypes.func.isRequired,
  slot: PropTypes.shape({
    id: PropTypes.string.isRequired,
    kind: PropTypes.string.isRequired,
    index: PropTypes.number,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    supportsRotation: PropTypes.bool,
  }).isRequired,
};
