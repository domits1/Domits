import React from "react";
import PropTypes from "prop-types";
import { CollapsibleSection } from "../WebsiteEditorFields";
import { WebsiteEditorImageSlotCard } from "../WebsiteEditorImageSlotCard";
import styles from "../../WebsiteEditorPage.module.scss";

export function WebsiteEditorImageSlotsSection({
  editorValues,
  highlightedTargetId,
  onChangeImageRotation,
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
        {imageSlots.map((slot) => (
          <WebsiteEditorImageSlotCard
            key={slot.id}
            slot={slot}
            editorValues={editorValues}
            highlightedTargetId={highlightedTargetId}
            importedImageOptions={importedImageOptions}
            onChangeImageRotation={onChangeImageRotation}
            onOpenImagePicker={onOpenImagePicker}
            setTargetRef={setTargetRef}
          />
        ))}
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
      rotation: PropTypes.shape({
        hero: PropTypes.bool,
        residence: PropTypes.bool,
        gallery: PropTypes.arrayOf(PropTypes.bool),
      }),
    }).isRequired,
  }).isRequired,
  highlightedTargetId: PropTypes.string.isRequired,
  onChangeImageRotation: PropTypes.func.isRequired,
  imageSlots: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      kind: PropTypes.string.isRequired,
      index: PropTypes.number,
      label: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      supportsRotation: PropTypes.bool,
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
