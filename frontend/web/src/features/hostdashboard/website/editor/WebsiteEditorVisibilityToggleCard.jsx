import React from "react";
import PropTypes from "prop-types";
import styles from "../WebsiteEditorPage.module.scss";

export function WebsiteEditorVisibilityToggleCard({
  checked,
  descriptionId,
  disabled = false,
  field,
  inputId,
  isHighlighted = false,
  labelId,
  targetRef = null,
  onChange,
}) {
  return (
    <label
      ref={targetRef}
      htmlFor={inputId}
      className={`${styles.toggleCard} ${disabled ? styles.toggleCardDisabled : ""} ${
        isHighlighted ? styles.editorTargetHighlighted : ""
      }`.trim()}
    >
      <div className={styles.toggleCopy}>
        <span id={labelId} className={styles.toggleLabel}>{field.label}</span>
        <span id={descriptionId} className={styles.toggleDescription}>{field.description}</span>
      </div>
      <input
        id={inputId}
        type="checkbox"
        className={styles.toggleInput}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      />
    </label>
  );
}

WebsiteEditorVisibilityToggleCard.propTypes = {
  checked: PropTypes.bool.isRequired,
  descriptionId: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  field: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  }).isRequired,
  inputId: PropTypes.string.isRequired,
  isHighlighted: PropTypes.bool,
  labelId: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  targetRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
};
