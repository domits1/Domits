import React, { useRef } from "react";
import PropTypes from "prop-types";
import { getAmenityIconNode } from "../rendering/amenityIconRegistry";
import {
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  WEBSITE_CONTACT_AVATAR_MODE_INITIALS,
  resolveWebsiteContactAvatarMode,
} from "../config/websiteContactSectionConfig";
import {
  fieldPropTypes,
  refPropType,
} from "./websiteEditorUtils";
import styles from "../WebsiteEditorPage.module.scss";
import arrowDownIcon from "../../../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../../../images/arrow-up-icon.svg";
export { ContactColorField, BackgroundColorField } from "./fields/WebsiteEditorColorField";

export function TextField({
  field,
  value,
  onChange,
  onKeyDown = undefined,
  fieldRef = null,
  isHighlighted = false,
  onFocus = undefined,
  onBlur = undefined,
}) {
  const normalizedValue = typeof value === "string" ? value : "";

  if (field.component === "textarea") {
    return (
      <div
        ref={fieldRef}
        className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
      >
        <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
          {field.label}
        </label>
        <textarea
          id={`website-editor-${field.key}`}
          className={styles.textArea}
          value={normalizedValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>
    );
  }

  return (
    <div
      ref={fieldRef}
      className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
        {field.label}
      </label>
      <input
        id={`website-editor-${field.key}`}
        className={styles.textInput}
        value={normalizedValue}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </div>
  );
}

TextField.propTypes = {
  field: fieldPropTypes.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  fieldRef: refPropType,
  isHighlighted: PropTypes.bool,
  onKeyDown: PropTypes.func,
};

const selectFieldOptionPropType = PropTypes.shape({
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
});

export function SelectField({
  field,
  value,
  options,
  onChange,
  fieldRef = null,
  isHighlighted = false,
  onFocus = undefined,
  onBlur = undefined,
}) {
  const normalizedValue = typeof value === "string" ? value : "";

  return (
    <div
      ref={fieldRef}
      className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <label className={styles.fieldLabel} htmlFor={`website-editor-${field.key}`}>
        {field.label}
      </label>
      <select
        id={`website-editor-${field.key}`}
        className={styles.textInput}
        value={normalizedValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

SelectField.propTypes = {
  field: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(selectFieldOptionPropType).isRequired,
  onChange: PropTypes.func.isRequired,
  fieldRef: refPropType,
  isHighlighted: PropTypes.bool,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

export function PositionMatrixField({
  field,
  value,
  options,
  onChange,
  fieldRef = null,
  isHighlighted = false,
  onFocus = undefined,
  onBlur = undefined,
}) {
  const normalizedValue = typeof value === "string" ? value : "";
  const descriptionId = field.description ? `website-editor-${field.key}-description` : undefined;
  const handleGroupBlur = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    onBlur?.(event);
  };

  return (
    <fieldset
      ref={fieldRef}
      className={`${styles.fieldGroup} ${styles.positionMatrixFieldset} ${
        isHighlighted ? styles.editorTargetHighlighted : ""
      }`.trim()}
      aria-describedby={descriptionId}
      onFocus={onFocus}
      onBlur={handleGroupBlur}
    >
      <legend className={`${styles.fieldLabel} ${styles.positionMatrixLegend}`.trim()}>{field.label}</legend>
      {field.description ? (
        <p id={descriptionId} className={styles.helperText}>
          {field.description}
        </p>
      ) : null}
      <div className={styles.positionMatrixGrid}>
        {options.map((option) => {
          const isSelected = normalizedValue === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`${styles.positionMatrixButton} ${
                isSelected ? styles.positionMatrixButtonSelected : ""
              }`.trim()}
              data-position-value={option.value}
              aria-label={option.label}
              aria-pressed={isSelected}
              title={option.label}
              onClick={() => {
                onChange(option.value);
              }}
            >
              <span className={styles.positionMatrixButtonFrame} aria-hidden="true">
                <span className={styles.positionMatrixButtonDot} />
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

PositionMatrixField.propTypes = {
  field: PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  value: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(selectFieldOptionPropType).isRequired,
  onChange: PropTypes.func.isRequired,
  fieldRef: refPropType,
  isHighlighted: PropTypes.bool,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
};

const resolveContactImagePreview = ({
  normalizedMode,
  normalizedValue,
  normalizedFallbackImage,
}) => {
  if (normalizedMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM) {
    return normalizedValue;
  }

  if (normalizedMode === WEBSITE_CONTACT_AVATAR_MODE_HOST) {
    return normalizedFallbackImage;
  }

  return "";
};

const resolveContactImageHelperText = ({
  hasCustomImage,
  isUsingInitials,
  hasProfilePhoto,
}) => {
  if (hasCustomImage) {
    return "Custom uploaded image active for this footer.";
  }

  if (isUsingInitials) {
    return "The footer will use the host initial instead of a profile image.";
  }

  if (hasProfilePhoto) {
    return "Using the current host profile picture from Domits.";
  }

  return "No host profile picture is available, so the footer will use initials.";
};

const buildContactImageFieldState = ({ mode, value, fallbackImage }) => {
  const normalizedMode = resolveWebsiteContactAvatarMode(mode, WEBSITE_CONTACT_AVATAR_MODE_HOST);
  const normalizedValue = String(value || "").trim();
  const normalizedFallbackImage = String(fallbackImage || "").trim();
  const hasProfilePhoto = Boolean(normalizedFallbackImage);
  const isUsingInitials =
    normalizedMode === WEBSITE_CONTACT_AVATAR_MODE_INITIALS ||
    (normalizedMode === WEBSITE_CONTACT_AVATAR_MODE_HOST && !hasProfilePhoto);
  const previewImage = resolveContactImagePreview({
    normalizedMode,
    normalizedValue,
    normalizedFallbackImage,
  });
  const hasCustomImage =
    normalizedMode === WEBSITE_CONTACT_AVATAR_MODE_CUSTOM && Boolean(normalizedValue);

  return {
    normalizedMode,
    hasProfilePhoto,
    isUsingInitials,
    previewImage,
    helperText: resolveContactImageHelperText({
      hasCustomImage,
      isUsingInitials,
      hasProfilePhoto,
    }),
  };
};

export function ContactImageField({
  mode = WEBSITE_CONTACT_AVATAR_MODE_HOST,
  inputId,
  value,
  fallbackImage = "",
  onChangeFile,
  onUseInitials,
  onUseProfilePhoto,
  fieldRef = null,
  isHighlighted = false,
}) {
  const {
    normalizedMode,
    hasProfilePhoto,
    isUsingInitials,
    previewImage,
    helperText,
  } = buildContactImageFieldState({
    mode,
    value,
    fallbackImage,
  });
  const previewFallbackLabel = isUsingInitials ? "Using host initials" : "No image selected";
  const showUseProfilePhotoButton =
    hasProfilePhoto && normalizedMode !== WEBSITE_CONTACT_AVATAR_MODE_HOST;
  const showUseInitialsButton = isUsingInitials === false;
  const fileInputRef = useRef(null);
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      ref={fieldRef}
      className={`${styles.imageSlotCard} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <div className={styles.imageSlotPreview}>
        {previewImage ? (
          <img src={previewImage} alt="" aria-hidden="true" className={styles.imageSlotPreviewImage} />
        ) : (
          <span className={styles.imageSlotPreviewEmpty}>{previewFallbackLabel}</span>
        )}
      </div>

      <div className={styles.imageSlotMeta}>
        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Profile photo</span>
          <span className={styles.helperText}>{helperText}</span>
        </div>

        <div className={styles.buttonRow}>
          <input
            ref={fileInputRef}
            id={inputId}
            hidden
            type="file"
            accept="image/*"
            onChange={onChangeFile}
          />
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={openFilePicker}
          >
            Upload image
          </button>
          {showUseProfilePhotoButton ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onUseProfilePhoto}
            >
              Use profile photo
            </button>
          ) : null}
          {showUseInitialsButton ? (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onUseInitials}
            >
              Use initials
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

ContactImageField.propTypes = {
  mode: PropTypes.string,
  inputId: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  fallbackImage: PropTypes.string,
  onChangeFile: PropTypes.func.isRequired,
  onUseInitials: PropTypes.func.isRequired,
  onUseProfilePhoto: PropTypes.func.isRequired,
  fieldRef: refPropType,
  isHighlighted: PropTypes.bool,
};

export function AmenityIconSelectField({
  fieldKey,
  label,
  value,
  onOpenPicker,
  onFocus = undefined,
  onBlur = undefined,
  fieldRef = null,
  isHighlighted = false,
}) {
  const selectedIconNode = getAmenityIconNode(value, {
    className: styles.iconSelectionPreviewGlyph,
    "aria-hidden": true,
    focusable: "false",
    sx: {
      color: "#1f4e79",
      fontSize: 22,
      padding: 0,
    },
  });
  return (
    <div
      ref={fieldRef}
      className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <button
        id={`website-editor-${fieldKey}`}
        type="button"
        className={styles.iconSelectionTrigger}
        onClick={onOpenPicker}
        onFocus={onFocus}
        onBlur={onBlur}
        aria-label={`Choose icon for ${label.toLowerCase()}`}
        title={`Choose icon for ${label.toLowerCase()}`}
      >
        <span className={styles.iconSelectionPreviewIcon} aria-hidden="true">
          {selectedIconNode}
        </span>
      </button>
    </div>
  );
}

AmenityIconSelectField.propTypes = {
  fieldKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onOpenPicker: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  fieldRef: refPropType,
  isHighlighted: PropTypes.bool,
};

export function CollapsibleSection({
  sectionId,
  title,
  description,
  isOpen,
  onToggle,
  sectionRef = null,
  children,
}) {
  const toggleIcon = isOpen ? arrowUpIcon : arrowDownIcon;

  return (
    <section
      ref={sectionRef}
      className={styles.panelSection}
    >
      <button
        type="button"
        className={styles.sectionToggle}
        onClick={() => onToggle(sectionId)}
        aria-expanded={isOpen}
      >
        <div className={styles.sectionBlockHeader}>
          <h3 className={styles.sectionBlockTitle}>{title}</h3>
          <p className={styles.sectionBlockDescription}>{description}</p>
        </div>
        <img
          src={toggleIcon}
          alt=""
          aria-hidden="true"
          className={styles.sectionToggleIcon}
        />
      </button>

      <div
        className={`${styles.panelSectionBody} ${isOpen ? styles.panelSectionBodyOpen : ""}`.trim()}
        aria-hidden={!isOpen}
      >
        <div className={styles.panelSectionBodyInner}>{children}</div>
      </div>
    </section>
  );
}

CollapsibleSection.propTypes = {
  sectionId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  sectionRef: refPropType,
  children: PropTypes.node.isRequired,
};
