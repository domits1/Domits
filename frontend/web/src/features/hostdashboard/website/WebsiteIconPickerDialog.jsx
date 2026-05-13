import React from "react";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PropTypes from "prop-types";
import {
  getAmenityIconNode,
  getAmenityIconSignature,
} from "./rendering/amenityIconRegistry";
import styles from "./WebsiteEditorPage.module.scss";

function WebsiteIconPickerDialog({
  isOpen = false,
  label = "",
  amenityIconOptions = [],
  selectedAmenityId = "",
  onSelectIcon,
  onClose,
}) {
  if (!isOpen) {
    return null;
  }

  const selectedIconSignature = getAmenityIconSignature(selectedAmenityId);

  return (
    <dialog
      open
      className={styles.imagePickerOverlay}
      aria-label={`Select icon for ${label}`}
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
      <section className={styles.iconPickerDialog}>
        <div className={styles.imagePickerHeader}>
          <div className={styles.imagePickerHeaderCopy}>
            <p className={styles.eyebrow}>Choose icon</p>
            <h2 className={styles.panelTitle}>{label}</h2>
          </div>

          <button
            type="button"
            className={styles.imagePickerCloseButton}
            onClick={onClose}
            aria-label="Close icon picker"
          >
            <CloseOutlinedIcon fontSize="small" />
          </button>
        </div>

        <div className={styles.iconPickerRail}>
          <div className={styles.iconPickerGrid}>
            {amenityIconOptions.map((iconOption) => {
              const isSelected =
                Boolean(selectedIconSignature) && selectedIconSignature === iconOption.iconSignature;
              const iconNode = getAmenityIconNode(iconOption.id, {
                className: styles.iconPickerOptionGlyph,
                "aria-hidden": true,
                focusable: "false",
                sx: {
                  color: "#1f4e79",
                  fontSize: 24,
                  padding: 0,
                },
              });

              return (
                <button
                  key={iconOption.id}
                  type="button"
                  className={`${styles.iconPickerOption} ${
                    isSelected ? styles.iconPickerOptionActive : ""
                  }`.trim()}
                  onClick={() => onSelectIcon(iconOption.id)}
                  aria-label={iconOption.label}
                  title={iconOption.label}
                >
                  {iconNode}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </dialog>
  );
}

WebsiteIconPickerDialog.propTypes = {
  isOpen: PropTypes.bool,
  label: PropTypes.string,
  amenityIconOptions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      category: PropTypes.string,
      iconSignature: PropTypes.string.isRequired,
    })
  ),
  selectedAmenityId: PropTypes.string,
  onSelectIcon: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default WebsiteIconPickerDialog;
