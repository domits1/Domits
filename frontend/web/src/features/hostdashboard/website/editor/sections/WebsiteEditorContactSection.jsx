import React from "react";
import PropTypes from "prop-types";
import {
  ContactColorField,
  ContactImageField,
  CollapsibleSection,
  TextField,
} from "../WebsiteEditorFields";
import { WebsiteEditorSectionVisibilityFieldCard } from "../WebsiteEditorPageSupport";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS } from "../../websiteEditorConfig";
import {
  resolveWebsiteContactAccentColor,
  resolveWebsiteContactBackgroundColor,
} from "../../config/websiteContactSectionConfig";
import styles from "../../WebsiteEditorPage.module.scss";

export function WebsiteEditorContactSection({
  activatePreviewTarget,
  clearActivePreviewTarget,
  commitContactAccentColorInput,
  commitContactBackgroundColorInput,
  contactSectionFields,
  contactSectionVisibilityField,
  contactWidgetVisibilityField,
  editorValues,
  handleContactAccentColorChange,
  handleContactAccentColorInputChange,
  handleContactAccentColorInputKeyDown,
  handleContactBackgroundColorChange,
  handleContactBackgroundColorInputChange,
  handleContactBackgroundColorInputKeyDown,
  handleContactFieldChange,
  handleContactImageFileChange,
  handleContactImageUseInitials,
  handleContactImageUseProfilePhoto,
  handleEditorFieldKeyDown,
  handleVisibilityFieldChange,
  hasWhatsAppWidget,
  highlightedTargetId,
  isOpen,
  onToggle,
  previewModel,
  sectionRef,
  setTargetRef,
  showWhatsAppSetupHint,
}) {
  if (
    contactSectionFields.length < 1 &&
    !contactSectionVisibilityField &&
    !contactWidgetVisibilityField
  ) {
    return null;
  }

  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.contact}
      title="Contact footer"
      description="Adjust the footer copy, profile photo override, and surface colors for the panorama contact section."
      isOpen={isOpen}
      onToggle={onToggle}
      sectionRef={sectionRef}
    >
      <div className={styles.fieldStack}>
        {contactWidgetVisibilityField || contactSectionVisibilityField ? (
          <div className={styles.toggleStack}>
            {showWhatsAppSetupHint ? (
              <p className={styles.helperText}>
                Connect WhatsApp in the integrations marketplace to unlock direct guest contact on the
                website.
              </p>
            ) : null}
            {contactWidgetVisibilityField ? (
              <WebsiteEditorSectionVisibilityFieldCard
                checked={Boolean(editorValues.visibility.chatWidget)}
                field={contactWidgetVisibilityField}
                handleVisibilityFieldChange={handleVisibilityFieldChange}
                hasWhatsAppWidget={hasWhatsAppWidget}
                highlightedTargetId={highlightedTargetId}
                setTargetRef={setTargetRef}
              />
            ) : null}
            {contactSectionVisibilityField ? (
              <WebsiteEditorSectionVisibilityFieldCard
                checked={Boolean(editorValues.visibility.contactSection)}
                field={contactSectionVisibilityField}
                handleVisibilityFieldChange={handleVisibilityFieldChange}
                hasWhatsAppWidget={hasWhatsAppWidget}
                highlightedTargetId={highlightedTargetId}
                setTargetRef={setTargetRef}
              />
            ) : null}
          </div>
        ) : null}

        {contactSectionFields.map((field) => (
          <TextField
            key={field.key}
            field={{ key: `contact-${field.key}`, label: field.label, component: field.component }}
            value={editorValues.contact[field.key]}
            onChange={handleContactFieldChange(field.key)}
            onKeyDown={handleEditorFieldKeyDown(field)}
            fieldRef={setTargetRef(EDITOR_TARGET_KEYS.contact[field.key])}
            isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.contact[field.key]}
            onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.contact[field.key])}
            onBlur={clearActivePreviewTarget}
          />
        ))}

        <ContactImageField
          mode={editorValues.contact.avatarMode}
          inputId="website-editor-contact-avatar-upload"
          value={editorValues.contact.avatarImage}
          fallbackImage={previewModel.host?.profileImage || ""}
          onChangeFile={handleContactImageFileChange}
          onUseInitials={handleContactImageUseInitials}
          onUseProfilePhoto={handleContactImageUseProfilePhoto}
          fieldRef={setTargetRef(EDITOR_TARGET_KEYS.contact.avatarImage)}
          isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.contact.avatarImage}
        />

        <ContactColorField
          label="Footer color"
          hint="Controls the main surface color behind the contact footer."
          value={editorValues.contact.backgroundColor}
          placeholder="#1b2436"
          resolveColorValue={resolveWebsiteContactBackgroundColor}
          inputAriaLabel="Contact footer background color"
          onSelectColor={handleContactBackgroundColorChange}
          onChangeInput={handleContactBackgroundColorInputChange}
          onCommitInput={commitContactBackgroundColorInput}
          onInputKeyDown={handleContactBackgroundColorInputKeyDown}
          fieldRef={setTargetRef(EDITOR_TARGET_KEYS.contact.backgroundColor)}
          isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.contact.backgroundColor}
          onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.contact.backgroundColor)}
          onBlur={clearActivePreviewTarget}
        />

        <ContactColorField
          label="Accent color"
          hint="Used for the eyebrow, avatar ring, and section highlights."
          value={editorValues.contact.accentColor}
          placeholder="#f5e5cb"
          resolveColorValue={resolveWebsiteContactAccentColor}
          inputAriaLabel="Contact footer accent color"
          onSelectColor={handleContactAccentColorChange}
          onChangeInput={handleContactAccentColorInputChange}
          onCommitInput={commitContactAccentColorInput}
          onInputKeyDown={handleContactAccentColorInputKeyDown}
          fieldRef={setTargetRef(EDITOR_TARGET_KEYS.contact.accentColor)}
          isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.contact.accentColor}
          onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.contact.accentColor)}
          onBlur={clearActivePreviewTarget}
        />
      </div>
    </CollapsibleSection>
  );
}

WebsiteEditorContactSection.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  clearActivePreviewTarget: PropTypes.func.isRequired,
  commitContactAccentColorInput: PropTypes.func.isRequired,
  commitContactBackgroundColorInput: PropTypes.func.isRequired,
  contactSectionFields: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      component: PropTypes.oneOf(["input", "textarea"]).isRequired,
    })
  ).isRequired,
  contactSectionVisibilityField: PropTypes.shape({
    description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }),
  contactWidgetVisibilityField: PropTypes.shape({
    description: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }),
  editorValues: PropTypes.shape({
    contact: PropTypes.shape({
      title: PropTypes.string,
      caption: PropTypes.string,
      description: PropTypes.string,
      avatarMode: PropTypes.string,
      avatarImage: PropTypes.string,
      accentColor: PropTypes.string,
      backgroundColor: PropTypes.string,
    }).isRequired,
    visibility: PropTypes.shape({
      contactSection: PropTypes.bool,
      chatWidget: PropTypes.bool,
    }).isRequired,
  }).isRequired,
  handleContactAccentColorChange: PropTypes.func.isRequired,
  handleContactAccentColorInputChange: PropTypes.func.isRequired,
  handleContactAccentColorInputKeyDown: PropTypes.func.isRequired,
  handleContactBackgroundColorChange: PropTypes.func.isRequired,
  handleContactBackgroundColorInputChange: PropTypes.func.isRequired,
  handleContactBackgroundColorInputKeyDown: PropTypes.func.isRequired,
  handleContactFieldChange: PropTypes.func.isRequired,
  handleContactImageFileChange: PropTypes.func.isRequired,
  handleContactImageUseInitials: PropTypes.func.isRequired,
  handleContactImageUseProfilePhoto: PropTypes.func.isRequired,
  handleEditorFieldKeyDown: PropTypes.func.isRequired,
  handleVisibilityFieldChange: PropTypes.func.isRequired,
  hasWhatsAppWidget: PropTypes.bool.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  previewModel: PropTypes.shape({
    host: PropTypes.shape({
      profileImage: PropTypes.string,
    }),
  }).isRequired,
  sectionRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.any,
    }),
  ]),
  setTargetRef: PropTypes.func.isRequired,
  showWhatsAppSetupHint: PropTypes.bool.isRequired,
};
