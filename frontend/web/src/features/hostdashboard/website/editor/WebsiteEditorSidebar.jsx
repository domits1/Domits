import React from "react";
import PropTypes from "prop-types";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import {
  AmenityIconSelectField,
  BackgroundColorField,
  CollapsibleSection,
  PositionMatrixField,
  TextField,
} from "./WebsiteEditorFields";
import { WebsiteEditorAmenitiesSection } from "./sections/WebsiteEditorAmenitiesSection";
import { WebsiteEditorResidenceSection } from "./sections/WebsiteEditorResidenceSection";
import { WebsiteEditorGallerySection } from "./sections/WebsiteEditorGallerySection";
import { WebsiteEditorImageSlotsSection } from "./sections/WebsiteEditorImageSlotsSection";
import { WebsiteEditorCalendarSection } from "./sections/WebsiteEditorCalendarSection";
import { WebsiteEditorContactSection } from "./sections/WebsiteEditorContactSection";
import { WebsiteEditorImageSlotCard } from "./WebsiteEditorImageSlotCard";
import { WebsiteEditorSectionVisibilityFieldCard } from "./WebsiteEditorPageSupport";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS } from "../websiteEditorConfig";
import styles from "../WebsiteEditorPage.module.scss";

const EMPTY_PREVIEW_MODEL = {
  host: {
    profileImage: "",
  },
};

const renderHeroEditorSection = ({
  commonTextFields,
  editorValues,
  expandedSections,
  handleCommonFieldChange,
  handleEditorFieldKeyDown,
  handleVisibilityFieldChange,
  hasWhatsAppWidget,
  heroAlignmentOptions,
  heroCallToActionVisibilityField,
  heroImageSlot,
  highlightedTargetId,
  importedImageOptions,
  markEditorInteracted,
  onChangeImageRotation,
  onOpenImagePicker,
  activatePreviewTarget,
  clearActivePreviewTarget,
  setSectionRef,
  setTargetRef,
  toggleSection,
}) => (
  <CollapsibleSection
    sectionId={EDITOR_SECTION_KEYS.common}
    title="Hero"
    description="Control the top-of-page copy, hero image, and template-specific hero settings."
    isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.common])}
    onToggle={toggleSection}
    sectionRef={setSectionRef(EDITOR_SECTION_KEYS.common)}
  >
    {heroImageSlot ? (
      <div className={styles.imageSlotGrid}>
        <WebsiteEditorImageSlotCard
          slot={heroImageSlot}
          editorValues={editorValues}
          highlightedTargetId={highlightedTargetId}
          importedImageOptions={importedImageOptions}
          onChangeImageRotation={onChangeImageRotation}
          onOpenImagePicker={onOpenImagePicker}
          setTargetRef={setTargetRef}
        />
      </div>
    ) : null}

    <div className={styles.fieldStack}>
      {heroAlignmentOptions.length > 0 ? (
        <PositionMatrixField
          field={{
            key: "heroContentAlignment",
            label: "Content position",
            description: "Choose where the hero eyebrow, title, and booking prompt sit inside the image.",
          }}
          value={editorValues.common.heroContentAlignment}
          options={heroAlignmentOptions}
          onChange={(nextValue) => {
            markEditorInteracted();
            handleCommonFieldChange("heroContentAlignment")({
              target: { value: nextValue },
            });
          }}
          fieldRef={setTargetRef(EDITOR_TARGET_KEYS.common.heroContentAlignment)}
          isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.common.heroContentAlignment}
          onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.common.heroContentAlignment)}
          onBlur={clearActivePreviewTarget}
        />
      ) : null}

      {commonTextFields.map((field) => (
        <TextField
          key={field.key}
          field={field}
          value={editorValues.common[field.key]}
          onChange={handleCommonFieldChange(field.key)}
          onKeyDown={handleEditorFieldKeyDown(field)}
          fieldRef={setTargetRef(EDITOR_TARGET_KEYS.common[field.key])}
          isHighlighted={highlightedTargetId === EDITOR_TARGET_KEYS.common[field.key]}
          onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.common[field.key])}
          onBlur={clearActivePreviewTarget}
        />
      ))}
    </div>

    {heroCallToActionVisibilityField ? (
      <div className={styles.toggleStack}>
        <WebsiteEditorSectionVisibilityFieldCard
          checked={Boolean(editorValues.visibility.callToAction)}
          field={heroCallToActionVisibilityField}
          handleVisibilityFieldChange={handleVisibilityFieldChange}
          hasWhatsAppWidget={hasWhatsAppWidget}
          highlightedTargetId={highlightedTargetId}
          setTargetRef={setTargetRef}
        />
      </div>
    ) : null}
  </CollapsibleSection>
);

export function WebsiteEditorSidebar({
  activatePreviewTarget,
  addAmenityItem,
  amenitiesConfig,
  amenitiesTextFields,
  amenitiesVisibilityField,
  calendarTextFields,
  calendarToggleFields,
  calendarVisibilityField,
  clearActivePreviewTarget,
  commitAmenitiesIconColorInput,
  commitCalendarPanelColorInput,
  commitContactAccentColorInput,
  commitContactBackgroundColorInput,
  commitGalleryPanelColorInput,
  commitResidencePanelColorInput,
  commitThemeBackgroundColorInput,
  commonTextFields,
  contactSectionFields,
  contactSectionVisibilityField,
  contactWidgetVisibilityField,
  copyCollectionConfig,
  draftTemplateKey,
  editorPanelRef,
  editorValues,
  expandedSections,
  forwardEditorBoundaryScroll,
  galleryImageSlots,
  galleryPanelToggleFields,
  galleryTextFields,
  galleryVisibilityField,
  generalImageSlots,
  heroAlignmentOptions,
  heroCallToActionVisibilityField,
  heroImageSlot,
  handleAmenitiesIconColorChange,
  handleAmenitiesIconColorInputChange,
  handleAmenitiesIconColorInputKeyDown,
  handleAmenitiesSectionFieldChange,
  handleCalendarFieldChange,
  handleCalendarPanelColorChange,
  handleCalendarPanelColorInputChange,
  handleCalendarPanelColorInputKeyDown,
  handleCalendarPanelToggleChange,
  handleCollectionFieldChange,
  handleCommonFieldChange,
  handleCommonToggleFieldChange,
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
  handleGalleryPanelColorChange,
  handleGalleryPanelColorInputChange,
  handleGalleryPanelColorInputKeyDown,
  handleGalleryPanelToggleChange,
  handleGallerySectionFieldChange,
  handleResidencePanelColorChange,
  handleResidencePanelColorInputChange,
  handleResidencePanelColorInputKeyDown,
  handleThemeBackgroundColorChange,
  handleThemeBackgroundColorInputChange,
  handleThemeBackgroundColorInputKeyDown,
  handleVisibilityFieldChange,
  hasUnsavedChanges,
  hasWhatsAppWidget,
  highlightedTargetId,
  importedImageOptions,
  isEditorReady,
  isMutatingDraft,
  isSaving,
  markEditorInteracted,
  moveAmenityItemDown,
  moveAmenityItemUp,
  onChangeImageRotation,
  onOpenIconPicker,
  onOpenImagePicker,
  previewModel,
  removeAmenityItem,
  residenceImageSlot,
  residenceSectionTitle,
  residenceTextFields,
  residenceToggleFields,
  saveDraftChanges,
  setSectionRef,
  setTargetRef,
  showWhatsAppSetupHint,
  standaloneVisibilityFields,
  themeValues,
  toggleSection,
}) {
  if (!isEditorReady) {
    return (
      <aside ref={editorPanelRef} className={styles.editorPanel} onWheel={forwardEditorBoundaryScroll}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Editor</h2>
        </div>
        <div className={styles.loadingSectionBody}>
          <PulseBarsLoader message="Loading editor controls..." />
        </div>
      </aside>
    );
  }

  const amenitiesVisibilityContent = amenitiesVisibilityField ? (
    <WebsiteEditorSectionVisibilityFieldCard
      checked={Boolean(editorValues.visibility.amenitiesPanel)}
      field={amenitiesVisibilityField}
      handleVisibilityFieldChange={handleVisibilityFieldChange}
      hasWhatsAppWidget={hasWhatsAppWidget}
      highlightedTargetId={highlightedTargetId}
      setTargetRef={setTargetRef}
    />
  ) : null;

  const renderedAmenitiesSection = amenitiesConfig ? (
    <WebsiteEditorAmenitiesSection
      activatePreviewTarget={activatePreviewTarget}
      addAmenityItem={addAmenityItem}
      amenitiesConfig={amenitiesConfig}
      amenitiesVisibilityContent={amenitiesVisibilityContent}
      amenitiesTextFields={amenitiesTextFields}
      canAddAmenity={editorValues.amenities.length < amenitiesConfig.maxCount}
      clearActivePreviewTarget={clearActivePreviewTarget}
      commitAmenitiesIconColorInput={commitAmenitiesIconColorInput}
      draftTemplateKey={draftTemplateKey}
      editorValues={editorValues}
      handleAmenitiesIconColorChange={handleAmenitiesIconColorChange}
      handleAmenitiesIconColorInputChange={handleAmenitiesIconColorInputChange}
      handleAmenitiesIconColorInputKeyDown={handleAmenitiesIconColorInputKeyDown}
      handleAmenitiesSectionFieldChange={handleAmenitiesSectionFieldChange}
      handleCollectionFieldChange={handleCollectionFieldChange}
      handleEditorFieldKeyDown={handleEditorFieldKeyDown}
      highlightedTargetId={highlightedTargetId}
      isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.amenities])}
      moveAmenityItemDown={moveAmenityItemDown}
      moveAmenityItemUp={moveAmenityItemUp}
      onOpenIconPicker={onOpenIconPicker}
      removeAmenityItem={removeAmenityItem}
      sectionRef={setSectionRef(EDITOR_SECTION_KEYS.amenities)}
      setTargetRef={setTargetRef}
      toggleSection={toggleSection}
    />
  ) : null;

  const renderedTrustCardsSection = copyCollectionConfig.trustCards ? (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.trustCards}
      title={copyCollectionConfig.trustCards.title}
      description={copyCollectionConfig.trustCards.description}
      isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.trustCards])}
      onToggle={toggleSection}
      sectionRef={setSectionRef(EDITOR_SECTION_KEYS.trustCards)}
    >
      <div className={styles.collectionStack}>
        {editorValues.trustCards
          .slice(0, copyCollectionConfig.trustCards.count)
          .map((card, index) => (
            <div
              key={card.id}
              ref={setTargetRef(EDITOR_TARGET_KEYS.trustCards(index))}
              className={`${styles.collectionCard} ${
                highlightedTargetId === EDITOR_TARGET_KEYS.trustCards(index)
                  ? styles.editorTargetHighlighted
                  : ""
              }`.trim()}
            >
              <p className={styles.collectionTitle}>
                {copyCollectionConfig.trustCards.itemLabel} {index + 1}
              </p>
              {copyCollectionConfig.trustCards.supportsIconSelection ? (
                <AmenityIconSelectField
                  fieldKey={`trust-card-icon-${index}`}
                  label="Icon"
                  value={card.iconAmenityId || ""}
                  onOpenPicker={() =>
                    onOpenIconPicker(
                      "trustCards",
                      index,
                      `${copyCollectionConfig.trustCards.itemLabel} ${index + 1} icon`
                    )
                  }
                  onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.trustCards(index))}
                  onBlur={clearActivePreviewTarget}
                />
              ) : null}
              <TextField
                field={{ key: `trust-card-title-${index}`, label: "Title", component: "input" }}
                value={card.title}
                onChange={handleCollectionFieldChange("trustCards", index, "title")}
                onKeyDown={handleEditorFieldKeyDown({ component: "input" })}
                onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.trustCards(index))}
                onBlur={clearActivePreviewTarget}
              />
              <TextField
                field={{
                  key: `trust-card-description-${index}`,
                  label: "Description",
                  component: "textarea",
                }}
                value={card.description}
                onChange={handleCollectionFieldChange("trustCards", index, "description")}
                onKeyDown={handleEditorFieldKeyDown({ component: "textarea" })}
                onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.trustCards(index))}
                onBlur={clearActivePreviewTarget}
              />
            </div>
          ))}
      </div>
    </CollapsibleSection>
  ) : null;

  return (
    <aside
      ref={editorPanelRef}
      className={styles.editorPanel}
      onWheel={forwardEditorBoundaryScroll}
      onInputCapture={markEditorInteracted}
      onChangeCapture={markEditorInteracted}
    >
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Editor</h2>
      </div>

      <div className={styles.editorForm}>
        {renderHeroEditorSection({
          commonTextFields,
          editorValues,
          expandedSections,
          handleCommonFieldChange,
          handleEditorFieldKeyDown,
          handleVisibilityFieldChange,
          hasWhatsAppWidget,
          heroAlignmentOptions,
          heroCallToActionVisibilityField,
          heroImageSlot,
          highlightedTargetId,
          importedImageOptions,
          markEditorInteracted,
          onChangeImageRotation,
          onOpenImagePicker,
          activatePreviewTarget,
          clearActivePreviewTarget,
          setSectionRef,
          setTargetRef,
          toggleSection,
        })}

        {renderedTrustCardsSection}

        {residenceTextFields.length > 0 || residenceToggleFields.length > 0 || residenceImageSlot ? (
          <WebsiteEditorResidenceSection
            activatePreviewTarget={activatePreviewTarget}
            clearActivePreviewTarget={clearActivePreviewTarget}
            commitResidencePanelColorInput={commitResidencePanelColorInput}
            editorValues={editorValues}
            handleCommonFieldChange={handleCommonFieldChange}
            handleCommonToggleFieldChange={handleCommonToggleFieldChange}
            handleEditorFieldKeyDown={handleEditorFieldKeyDown}
            handleResidencePanelColorChange={handleResidencePanelColorChange}
            handleResidencePanelColorInputChange={handleResidencePanelColorInputChange}
            handleResidencePanelColorInputKeyDown={handleResidencePanelColorInputKeyDown}
            highlightedTargetId={highlightedTargetId}
            importedImageOptions={importedImageOptions}
            isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.residence])}
            onChangeImageRotation={onChangeImageRotation}
            onOpenImagePicker={onOpenImagePicker}
            residenceImageSlot={residenceImageSlot}
            residenceTextFields={residenceTextFields}
            residenceToggleFields={residenceToggleFields}
            sectionRef={setSectionRef(EDITOR_SECTION_KEYS.residence)}
            sectionTitle={residenceSectionTitle}
            setTargetRef={setTargetRef}
            toggleSection={toggleSection}
          />
        ) : null}

        {galleryVisibilityField ||
        galleryTextFields.length > 0 ||
        galleryImageSlots.length > 0 ||
        galleryPanelToggleFields.length > 0 ? (
          <WebsiteEditorGallerySection
            activatePreviewTarget={activatePreviewTarget}
            clearActivePreviewTarget={clearActivePreviewTarget}
            commitGalleryPanelColorInput={commitGalleryPanelColorInput}
            editorValues={editorValues}
            galleryImageSlots={galleryImageSlots}
            galleryPanelToggleFields={galleryPanelToggleFields}
            galleryTextFields={galleryTextFields}
            galleryVisibilityField={galleryVisibilityField}
            handleEditorFieldKeyDown={handleEditorFieldKeyDown}
            handleGalleryPanelColorChange={handleGalleryPanelColorChange}
            handleGalleryPanelColorInputChange={handleGalleryPanelColorInputChange}
            handleGalleryPanelColorInputKeyDown={handleGalleryPanelColorInputKeyDown}
            handleGalleryPanelToggleChange={handleGalleryPanelToggleChange}
            handleGallerySectionFieldChange={handleGallerySectionFieldChange}
            handleVisibilityFieldChange={handleVisibilityFieldChange}
            highlightedTargetId={highlightedTargetId}
            importedImageOptions={importedImageOptions}
            isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.gallery])}
            onChangeImageRotation={onChangeImageRotation}
            onOpenImagePicker={onOpenImagePicker}
            sectionRef={setSectionRef(EDITOR_SECTION_KEYS.gallery)}
            setTargetRef={setTargetRef}
            templateKey={draftTemplateKey}
            toggleSection={toggleSection}
          />
        ) : null}

        <CollapsibleSection
          sectionId={EDITOR_SECTION_KEYS.theme}
          title="Theme"
          description="Choose the background surface color used behind the website sections."
          isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.theme])}
          onToggle={toggleSection}
          sectionRef={setSectionRef(EDITOR_SECTION_KEYS.theme)}
        >
          <BackgroundColorField
            value={themeValues.backgroundColor}
            customValue={themeValues.backgroundColorInput}
            onSelectColor={handleThemeBackgroundColorChange}
            onChangeCustomColor={handleThemeBackgroundColorInputChange}
            onCommitCustomColor={commitThemeBackgroundColorInput}
            onCustomColorKeyDown={handleThemeBackgroundColorInputKeyDown}
          />
        </CollapsibleSection>

        {standaloneVisibilityFields.length > 0 ? (
          <CollapsibleSection
            sectionId={EDITOR_SECTION_KEYS.visibility}
            title="Section visibility"
            description="Toggle major sections without changing the underlying draft data."
            isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.visibility])}
            onToggle={toggleSection}
            sectionRef={setSectionRef(EDITOR_SECTION_KEYS.visibility)}
          >
            <div className={styles.toggleStack}>
              {showWhatsAppSetupHint &&
              standaloneVisibilityFields.some((field) => field.key === "chatWidget") ? (
                <p className={styles.helperText}>
                  Connect WhatsApp in the integrations marketplace to unlock direct guest contact on the
                  website.
                </p>
              ) : null}
              {standaloneVisibilityFields.map((field) => (
                <WebsiteEditorSectionVisibilityFieldCard
                  key={field.key}
                  checked={Boolean(editorValues.visibility[field.key])}
                  field={field}
                  handleVisibilityFieldChange={handleVisibilityFieldChange}
                  hasWhatsAppWidget={hasWhatsAppWidget}
                  highlightedTargetId={highlightedTargetId}
                  setTargetRef={setTargetRef}
                />
              ))}
            </div>
          </CollapsibleSection>
        ) : null}

        <WebsiteEditorImageSlotsSection
          editorValues={editorValues}
          highlightedTargetId={highlightedTargetId}
          onChangeImageRotation={onChangeImageRotation}
          imageSlots={generalImageSlots}
          importedImageOptions={importedImageOptions}
          isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.images])}
          onOpenImagePicker={onOpenImagePicker}
          onToggle={toggleSection}
          sectionRef={setSectionRef(EDITOR_SECTION_KEYS.images)}
          setTargetRef={setTargetRef}
        />

        {copyCollectionConfig.amenities?.placement === "afterTrustCards" ? renderedAmenitiesSection : null}

        <WebsiteEditorCalendarSection
          activatePreviewTarget={activatePreviewTarget}
          calendarTextFields={calendarTextFields}
          calendarToggleFields={calendarToggleFields}
          calendarVisibilityField={calendarVisibilityField}
          clearActivePreviewTarget={clearActivePreviewTarget}
          commitCalendarPanelColorInput={commitCalendarPanelColorInput}
          editorValues={editorValues}
          handleCalendarFieldChange={handleCalendarFieldChange}
          handleEditorFieldKeyDown={handleEditorFieldKeyDown}
          handleCalendarPanelColorChange={handleCalendarPanelColorChange}
          handleCalendarPanelColorInputChange={handleCalendarPanelColorInputChange}
          handleCalendarPanelColorInputKeyDown={handleCalendarPanelColorInputKeyDown}
          handleCalendarPanelToggleChange={handleCalendarPanelToggleChange}
          handleVisibilityFieldChange={handleVisibilityFieldChange}
          highlightedTargetId={highlightedTargetId}
          isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.calendar])}
          sectionRef={setSectionRef(EDITOR_SECTION_KEYS.calendar)}
          setTargetRef={setTargetRef}
          templateKey={draftTemplateKey}
          toggleSection={toggleSection}
        />

        <WebsiteEditorContactSection
          activatePreviewTarget={activatePreviewTarget}
          clearActivePreviewTarget={clearActivePreviewTarget}
          commitContactAccentColorInput={commitContactAccentColorInput}
          commitContactBackgroundColorInput={commitContactBackgroundColorInput}
          contactSectionFields={contactSectionFields}
          contactSectionVisibilityField={contactSectionVisibilityField}
          contactWidgetVisibilityField={contactWidgetVisibilityField}
          editorValues={editorValues}
          handleContactAccentColorChange={handleContactAccentColorChange}
          handleContactAccentColorInputChange={handleContactAccentColorInputChange}
          handleContactAccentColorInputKeyDown={handleContactAccentColorInputKeyDown}
          handleContactBackgroundColorChange={handleContactBackgroundColorChange}
          handleContactBackgroundColorInputChange={handleContactBackgroundColorInputChange}
          handleContactBackgroundColorInputKeyDown={handleContactBackgroundColorInputKeyDown}
          handleContactFieldChange={handleContactFieldChange}
          handleContactImageFileChange={handleContactImageFileChange}
          handleContactImageUseInitials={handleContactImageUseInitials}
          handleContactImageUseProfilePhoto={handleContactImageUseProfilePhoto}
          handleEditorFieldKeyDown={handleEditorFieldKeyDown}
          handleVisibilityFieldChange={handleVisibilityFieldChange}
          hasWhatsAppWidget={hasWhatsAppWidget}
          highlightedTargetId={highlightedTargetId}
          isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.contact])}
          onToggle={toggleSection}
          previewModel={previewModel || EMPTY_PREVIEW_MODEL}
          sectionRef={setSectionRef(EDITOR_SECTION_KEYS.contact)}
          setTargetRef={setTargetRef}
          showWhatsAppSetupHint={showWhatsAppSetupHint}
        />

        {copyCollectionConfig.journeyStops ? (
          <CollapsibleSection
            sectionId={EDITOR_SECTION_KEYS.journeyStops}
            title={copyCollectionConfig.journeyStops.title}
            description={copyCollectionConfig.journeyStops.description}
            isOpen={Boolean(expandedSections[EDITOR_SECTION_KEYS.journeyStops])}
            onToggle={toggleSection}
            sectionRef={setSectionRef(EDITOR_SECTION_KEYS.journeyStops)}
          >
            <div className={styles.collectionStack}>
              {editorValues.journeyStops
                .slice(0, copyCollectionConfig.journeyStops.count)
                .map((stop, index) => (
                  <div
                    key={stop.id}
                    ref={setTargetRef(EDITOR_TARGET_KEYS.journeyStops(index))}
                    className={`${styles.collectionCard} ${
                      highlightedTargetId === EDITOR_TARGET_KEYS.journeyStops(index)
                        ? styles.editorTargetHighlighted
                        : ""
                    }`.trim()}
                  >
                    <p className={styles.collectionTitle}>
                      {copyCollectionConfig.journeyStops.itemLabel} {index + 1}
                    </p>
                    <TextField
                      field={{ key: `journey-stop-title-${index}`, label: "Title", component: "input" }}
                      value={stop.title}
                      onChange={handleCollectionFieldChange("journeyStops", index, "title")}
                      onKeyDown={handleEditorFieldKeyDown({ component: "input" })}
                      onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.journeyStops(index))}
                      onBlur={clearActivePreviewTarget}
                    />
                    <TextField
                      field={{
                        key: `journey-stop-description-${index}`,
                        label: "Description",
                        component: "textarea",
                      }}
                      value={stop.description}
                      onChange={handleCollectionFieldChange("journeyStops", index, "description")}
                      onKeyDown={handleEditorFieldKeyDown({ component: "textarea" })}
                      onFocus={activatePreviewTarget(EDITOR_TARGET_KEYS.journeyStops(index))}
                      onBlur={clearActivePreviewTarget}
                    />
                  </div>
                ))}
            </div>
          </CollapsibleSection>
        ) : null}

        {copyCollectionConfig.amenities?.placement === "afterJourneyStops" ? renderedAmenitiesSection : null}

        <div className={styles.editorFooter}>
          <p className={styles.editorFooterText}>
            Saves this draft only. Enter saves single-line fields; Ctrl/Cmd + Enter saves multi-line
            fields.
          </p>

          <div className={styles.buttonRow}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={saveDraftChanges}
              disabled={isMutatingDraft || !hasUnsavedChanges}
            >
              <SaveOutlinedIcon fontSize="small" />
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

WebsiteEditorSidebar.propTypes = {
  activatePreviewTarget: PropTypes.func.isRequired,
  addAmenityItem: PropTypes.func.isRequired,
  amenitiesConfig: PropTypes.object,
  amenitiesTextFields: PropTypes.array.isRequired,
  amenitiesVisibilityField: PropTypes.object,
  calendarTextFields: PropTypes.array.isRequired,
  calendarToggleFields: PropTypes.array.isRequired,
  calendarVisibilityField: PropTypes.object,
  clearActivePreviewTarget: PropTypes.func.isRequired,
  commitAmenitiesIconColorInput: PropTypes.func.isRequired,
  commitCalendarPanelColorInput: PropTypes.func.isRequired,
  commitContactAccentColorInput: PropTypes.func.isRequired,
  commitContactBackgroundColorInput: PropTypes.func.isRequired,
  commitGalleryPanelColorInput: PropTypes.func.isRequired,
  commitResidencePanelColorInput: PropTypes.func.isRequired,
  commitThemeBackgroundColorInput: PropTypes.func.isRequired,
  commonTextFields: PropTypes.array.isRequired,
  contactSectionFields: PropTypes.array.isRequired,
  contactSectionVisibilityField: PropTypes.object,
  contactWidgetVisibilityField: PropTypes.object,
  copyCollectionConfig: PropTypes.object.isRequired,
  draftTemplateKey: PropTypes.string.isRequired,
  editorPanelRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  editorValues: PropTypes.object.isRequired,
  expandedSections: PropTypes.object.isRequired,
  forwardEditorBoundaryScroll: PropTypes.func.isRequired,
  galleryImageSlots: PropTypes.array.isRequired,
  galleryPanelToggleFields: PropTypes.array.isRequired,
  galleryTextFields: PropTypes.array.isRequired,
  galleryVisibilityField: PropTypes.object,
  generalImageSlots: PropTypes.array.isRequired,
  heroAlignmentOptions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  heroCallToActionVisibilityField: PropTypes.object,
  heroImageSlot: PropTypes.object,
  handleAmenitiesIconColorChange: PropTypes.func.isRequired,
  handleAmenitiesIconColorInputChange: PropTypes.func.isRequired,
  handleAmenitiesIconColorInputKeyDown: PropTypes.func.isRequired,
  handleAmenitiesSectionFieldChange: PropTypes.func.isRequired,
  handleCalendarFieldChange: PropTypes.func.isRequired,
  handleCalendarPanelColorChange: PropTypes.func.isRequired,
  handleCalendarPanelColorInputChange: PropTypes.func.isRequired,
  handleCalendarPanelColorInputKeyDown: PropTypes.func.isRequired,
  handleCalendarPanelToggleChange: PropTypes.func.isRequired,
  handleCollectionFieldChange: PropTypes.func.isRequired,
  handleCommonFieldChange: PropTypes.func.isRequired,
  handleCommonToggleFieldChange: PropTypes.func.isRequired,
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
  handleGalleryPanelColorChange: PropTypes.func.isRequired,
  handleGalleryPanelColorInputChange: PropTypes.func.isRequired,
  handleGalleryPanelColorInputKeyDown: PropTypes.func.isRequired,
  handleGalleryPanelToggleChange: PropTypes.func.isRequired,
  handleGallerySectionFieldChange: PropTypes.func.isRequired,
  handleResidencePanelColorChange: PropTypes.func.isRequired,
  handleResidencePanelColorInputChange: PropTypes.func.isRequired,
  handleResidencePanelColorInputKeyDown: PropTypes.func.isRequired,
  handleThemeBackgroundColorChange: PropTypes.func.isRequired,
  handleThemeBackgroundColorInputChange: PropTypes.func.isRequired,
  handleThemeBackgroundColorInputKeyDown: PropTypes.func.isRequired,
  handleVisibilityFieldChange: PropTypes.func.isRequired,
  hasUnsavedChanges: PropTypes.bool.isRequired,
  hasWhatsAppWidget: PropTypes.bool.isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  importedImageOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
  isEditorReady: PropTypes.bool.isRequired,
  isMutatingDraft: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  markEditorInteracted: PropTypes.func.isRequired,
  moveAmenityItemDown: PropTypes.func.isRequired,
  moveAmenityItemUp: PropTypes.func.isRequired,
  onChangeImageRotation: PropTypes.func.isRequired,
  onOpenIconPicker: PropTypes.func.isRequired,
  onOpenImagePicker: PropTypes.func.isRequired,
  previewModel: PropTypes.object,
  removeAmenityItem: PropTypes.func.isRequired,
  residenceImageSlot: PropTypes.object,
  residenceSectionTitle: PropTypes.string.isRequired,
  residenceTextFields: PropTypes.array.isRequired,
  residenceToggleFields: PropTypes.array.isRequired,
  saveDraftChanges: PropTypes.func.isRequired,
  setSectionRef: PropTypes.func.isRequired,
  setTargetRef: PropTypes.func.isRequired,
  showWhatsAppSetupHint: PropTypes.bool.isRequired,
  standaloneVisibilityFields: PropTypes.array.isRequired,
  themeValues: PropTypes.object.isRequired,
  toggleSection: PropTypes.func.isRequired,
};
