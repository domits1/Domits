import React, { useEffect, useRef, useState } from "react";
import ColorizeOutlinedIcon from "@mui/icons-material/ColorizeOutlined";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import {
  WEBSITE_BACKGROUND_COLOR_OPTIONS,
  resolveWebsiteBackgroundColor,
} from "../../rendering/websiteDraftThemeOverrides";
import { refPropType } from "../websiteEditorUtils";
import styles from "../../WebsiteEditorPage.module.scss";

function InlineColorPicker({
  value,
  ariaLabel,
  isSelected = false,
  onSelectColor,
  onFocus = undefined,
  onBlur = undefined,
}) {
  const inputRef = useRef(null);
  const hadWindowBlurRef = useRef(false);
  const [isPickerFocused, setIsPickerFocused] = useState(false);
  const [isPickingScreenColor, setIsPickingScreenColor] = useState(false);
  const browserWindow = globalThis.window;
  const browserDocument = globalThis.document;
  const pickerShellClassName = `${styles.colorPickerShell} ${
    isSelected ? styles.colorPickerShellSelected : ""
  }`.trim();
  const supportsEyeDropper =
    browserWindow !== undefined && typeof browserWindow.EyeDropper === "function";

  useEffect(() => {
    if (!isPickerFocused || browserWindow === undefined) {
      return undefined;
    }

    const handleWindowBlur = () => {
      hadWindowBlurRef.current = true;
    };

    const handleWindowFocus = () => {
      if (!hadWindowBlurRef.current) {
        return;
      }

      hadWindowBlurRef.current = false;

      if (inputRef.current && browserDocument?.activeElement === inputRef.current) {
        browserWindow.setTimeout(() => {
          inputRef.current?.blur();
        }, 0);
      }
    };

    browserWindow.addEventListener("blur", handleWindowBlur);
    browserWindow.addEventListener("focus", handleWindowFocus);

    return () => {
      browserWindow.removeEventListener("blur", handleWindowBlur);
      browserWindow.removeEventListener("focus", handleWindowFocus);
    };
  }, [browserDocument, browserWindow, isPickerFocused]);

  const handleInputFocus = (event) => {
    hadWindowBlurRef.current = false;
    setIsPickerFocused(true);
    onFocus?.(event);
  };

  const handleInputBlur = (event) => {
    hadWindowBlurRef.current = false;
    setIsPickerFocused(false);
    onBlur?.(event);
  };

  const handleEyeDropperPick = async () => {
    if (!supportsEyeDropper || isPickingScreenColor) {
      return;
    }

    setIsPickingScreenColor(true);

    try {
      const eyeDropper = new browserWindow.EyeDropper();
      const result = await eyeDropper.open();

      if (result?.sRGBHex) {
        onSelectColor(result.sRGBHex);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        toast.error("Could not sample a color from the screen.");
      }
    } finally {
      setIsPickingScreenColor(false);
    }
  };

  return (
    <div className={styles.colorPickerControlGroup}>
      <div className={pickerShellClassName}>
        <input
          ref={inputRef}
          type="color"
          className={styles.colorPickerInput}
          value={value}
          onChange={(event) => onSelectColor(event.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          aria-label={ariaLabel}
        />
      </div>
      {supportsEyeDropper ? (
        <button
          type="button"
          className={styles.colorPickerEyeDropperButton}
          onClick={handleEyeDropperPick}
          aria-label="Pick color from screen"
          title="Pick color from screen"
          disabled={isPickingScreenColor}
        >
          <ColorizeOutlinedIcon fontSize="inherit" />
        </button>
      ) : null}
    </div>
  );
}

InlineColorPicker.propTypes = {
  value: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  isSelected: PropTypes.bool,
  onSelectColor: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
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
          <InlineColorPicker
            value={resolveColorValue(value)}
            ariaLabel={colorPickerAriaLabel}
            isSelected
            onSelectColor={onSelectColor}
            onFocus={onFocus}
            onBlur={onBlur}
          />
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
          <InlineColorPicker
            value={resolveWebsiteBackgroundColor(value)}
            ariaLabel="Pick a custom website background color"
            isSelected={!hasPresetSelection}
            onSelectColor={onSelectColor}
          />
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
