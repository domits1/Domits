import React, { useRef } from "react";
import PropTypes from "prop-types";
import { getAmenityIconNode } from "../rendering/amenityIconRegistry";
import {
  WEBSITE_BACKGROUND_COLOR_OPTIONS,
  resolveWebsiteBackgroundColor,
} from "../rendering/websiteDraftThemeOverrides";
import {
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  WEBSITE_CONTACT_AVATAR_MODE_INITIALS,
  resolveWebsiteContactAvatarMode,
} from "../rendering/websiteContactSectionConfig";
import {
  fieldPropTypes,
  refPropType,
} from "./websiteEditorUtils";
import styles from "../WebsiteEditorPage.module.scss";
import arrowDownIcon from "../../../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../../../images/arrow-up-icon.svg";

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
          value={value}
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
        value={value}
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

export function ContactColorField({
  label,
  hint,
  value,
  placeholder,
  resolveColorValue,
  inputAriaLabel,
  onSelectColor,
  onChangeInput,
  onCommitInput,
  onInputKeyDown,
  fieldRef = null,
  isHighlighted = false,
  onFocus = undefined,
  onBlur = undefined,
}) {
  const colorPickerAriaLabel = `${inputAriaLabel} picker`;

  return (
    <div
      ref={fieldRef}
      className={`${styles.fieldGroup} ${isHighlighted ? styles.editorTargetHighlighted : ""}`.trim()}
    >
      <div className={styles.customColorSection}>
        <div className={styles.customColorHeader}>
          <span className={styles.fieldLabel}>{label}</span>
          <p className={styles.customColorHint}>{hint}</p>
        </div>

        <div className={styles.customColorRow}>
          <div className={`${styles.colorPickerShell} ${styles.colorPickerShellSelected}`.trim()}>
            <input
              type="color"
              className={styles.colorPickerInput}
              value={resolveColorValue(value)}
              onChange={(event) => onSelectColor(event.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              aria-label={colorPickerAriaLabel}
            />
          </div>
          <input
            type="text"
            className={`${styles.textInput} ${styles.customColorInput}`.trim()}
            value={value}
            onChange={(event) => onChangeInput(event.target.value)}
            onBlur={() => {
              onCommitInput();
              onBlur?.();
            }}
            onFocus={onFocus}
            onKeyDown={onInputKeyDown}
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={placeholder}
            aria-label={inputAriaLabel}
          />
        </div>
      </div>
    </div>
  );
}

ContactColorField.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  placeholder: PropTypes.string.isRequired,
  resolveColorValue: PropTypes.func.isRequired,
  inputAriaLabel: PropTypes.string.isRequired,
  onSelectColor: PropTypes.func.isRequired,
  onChangeInput: PropTypes.func.isRequired,
  onCommitInput: PropTypes.func.isRequired,
  onInputKeyDown: PropTypes.func.isRequired,
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

export function BackgroundColorField({
  value,
  customValue,
  onSelectColor,
  onChangeCustomColor,
  onCommitCustomColor,
  onCustomColorKeyDown,
}) {
  const hasPresetSelection = WEBSITE_BACKGROUND_COLOR_OPTIONS.some(
    (colorOption) => colorOption.value === value
  );

  return (
    <div className={styles.fieldGroup}>
      <div className={styles.fieldLabel}>Background color</div>
      <div className={styles.colorGrid} role="radiogroup" aria-label="Website background color">
        {WEBSITE_BACKGROUND_COLOR_OPTIONS.map((colorOption) => {
          const isSelected = colorOption.value === value;
          return (
            <button
              key={colorOption.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`${styles.colorSwatchButton} ${isSelected ? styles.colorSwatchButtonSelected : ""}`.trim()}
              onClick={() => onSelectColor(colorOption.value)}
              title={colorOption.label}
            >
              <span
                className={styles.colorSwatch}
                style={{ backgroundColor: colorOption.value }}
                aria-hidden="true"
              />
              <span className={styles.colorSwatchLabel}>{colorOption.label}</span>
            </button>
          );
        })}
      </div>
      <div className={styles.customColorSection}>
        <div className={styles.customColorHeader}>
          <span className={styles.fieldLabel}>Custom color</span>
          <p className={styles.customColorHint}>
            Use a hex value if the preset grid is too limiting.
          </p>
        </div>
        <div className={styles.customColorRow}>
          <div
            className={`${styles.colorPickerShell} ${hasPresetSelection ? "" : styles.colorPickerShellSelected}`.trim()}
          >
            <input
              type="color"
              className={styles.colorPickerInput}
              value={resolveWebsiteBackgroundColor(value)}
              onChange={(event) => onSelectColor(event.target.value)}
              aria-label="Pick a custom website background color"
            />
          </div>
          <input
            type="text"
            className={`${styles.textInput} ${styles.customColorInput}`}
            value={customValue}
            onChange={(event) => onChangeCustomColor(event.target.value)}
            onBlur={onCommitCustomColor}
            onKeyDown={onCustomColorKeyDown}
            inputMode="text"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="#ffffff"
            aria-label="Custom background color hex code"
          />
        </div>
      </div>
    </div>
  );
}

BackgroundColorField.propTypes = {
  value: PropTypes.string.isRequired,
  customValue: PropTypes.string.isRequired,
  onSelectColor: PropTypes.func.isRequired,
  onChangeCustomColor: PropTypes.func.isRequired,
  onCommitCustomColor: PropTypes.func.isRequired,
  onCustomColorKeyDown: PropTypes.func.isRequired,
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
