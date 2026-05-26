import React from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PropTypes from "prop-types";
import { getImageOptionLabel, getSelectedImageForSlot } from "./editor/websiteEditorUtils";
import styles from "./WebsiteEditorPage.module.scss";

function WebsiteImagePickerDialog({
  editorValues,
  imagePickerState,
  importedImageOptions,
  onClose,
  onSelectImage,
}) {
  if (!imagePickerState.isOpen || !imagePickerState.slot) {
    return null;
  }

  return (
    <dialog
      open
      className={styles.imagePickerOverlay}
      aria-label={`Select image for ${imagePickerState.slot.label}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
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
            onClick={onClose}
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
                onClick={() => onSelectImage(imageUrl)}
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
  );
}

WebsiteImagePickerDialog.propTypes = {
  editorValues: PropTypes.shape({
    images: PropTypes.shape({
      heroImage: PropTypes.string,
      residenceImage: PropTypes.string,
      gallery: PropTypes.arrayOf(PropTypes.string),
    }).isRequired,
  }).isRequired,
  imagePickerState: PropTypes.shape({
    isOpen: PropTypes.bool.isRequired,
    slot: PropTypes.shape({
      label: PropTypes.string,
      kind: PropTypes.string,
      index: PropTypes.number,
    }),
  }).isRequired,
  importedImageOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  onClose: PropTypes.func.isRequired,
  onSelectImage: PropTypes.func.isRequired,
};

export default WebsiteImagePickerDialog;
