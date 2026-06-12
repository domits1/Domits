import { useState } from "react";
import {
  MAX_WEBSITE_CONFIGURABLE_AMENITIES,
  WEBSITE_AMENITY_FALLBACK_CATEGORY,
} from "../../config/websiteAmenitiesConfig";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS, getCollectionTargetId } from "../../websiteEditorConfig";
import { createAmenityEditorItem, runAfterNextPaint } from "../websiteEditorUtils";

const EMPTY_ICON_PICKER_STATE = Object.freeze({
  isOpen: false,
  collectionKey: "",
  itemIndex: -1,
  label: "",
});

export const useWebsiteEditorCollections = ({
  amenityIconOptions,
  editorValues,
  focusEditorTarget,
  setEditorValues,
  setPreviewTargetId,
}) => {
  const [iconPickerState, setIconPickerState] = useState(EMPTY_ICON_PICKER_STATE);

  const updateCollectionFieldValue = (collectionKey, itemIndex, fieldKey, nextValue) => {
    const targetId = getCollectionTargetId(collectionKey, itemIndex);

    setPreviewTargetId(targetId);
    setEditorValues((currentValues) => {
      const nextCollection = [...currentValues[collectionKey]];
      const currentItem = nextCollection[itemIndex];
      if (!currentItem) {
        return currentValues;
      }

      nextCollection[itemIndex] = {
        ...currentItem,
        [fieldKey]: nextValue,
      };

      return {
        ...currentValues,
        [collectionKey]: nextCollection,
      };
    });
  };

  const handleCollectionFieldChange = (collectionKey, itemIndex, fieldKey) => (event) => {
    updateCollectionFieldValue(collectionKey, itemIndex, fieldKey, event.target.value);
  };

  const openIconPicker = (collectionKey, itemIndex, label) => {
    if (!collectionKey || itemIndex < 0 || amenityIconOptions.length < 1) {
      return;
    }

    setPreviewTargetId(getCollectionTargetId(collectionKey, itemIndex));
    setIconPickerState({
      isOpen: true,
      collectionKey,
      itemIndex,
      label,
    });
  };

  const closeIconPicker = () => {
    setIconPickerState(EMPTY_ICON_PICKER_STATE);
  };

  const selectIconFromPicker = (iconAmenityId) => {
    if (!iconPickerState.collectionKey || iconPickerState.itemIndex < 0 || !iconAmenityId) {
      return;
    }

    if (iconPickerState.collectionKey === EDITOR_SECTION_KEYS.amenities) {
      const selectedIconOption = amenityIconOptions.find(
        (iconOption) => String(iconOption.id || "") === String(iconAmenityId || "")
      );
      setPreviewTargetId(EDITOR_TARGET_KEYS.amenities(iconPickerState.itemIndex));
      setEditorValues((currentValues) => {
        const nextAmenities = [...currentValues.amenities];
        const currentAmenity = nextAmenities[iconPickerState.itemIndex];
        if (!currentAmenity) {
          return currentValues;
        }

        nextAmenities[iconPickerState.itemIndex] = {
          ...currentAmenity,
          iconAmenityId,
          category:
            String(selectedIconOption?.category || "").trim() ||
            currentAmenity.category ||
            WEBSITE_AMENITY_FALLBACK_CATEGORY,
        };

        return {
          ...currentValues,
          amenities: nextAmenities,
        };
      });
      closeIconPicker();
      return;
    }

    updateCollectionFieldValue(
      iconPickerState.collectionKey,
      iconPickerState.itemIndex,
      "iconAmenityId",
      iconAmenityId
    );
    closeIconPicker();
  };

  const moveCollectionItem = (collectionKey, itemIndex, nextIndex) => {
    if (!collectionKey || itemIndex === nextIndex || itemIndex < 0 || nextIndex < 0) {
      return;
    }

    const nextTargetId = getCollectionTargetId(collectionKey, nextIndex);
    setPreviewTargetId(nextTargetId);
    setEditorValues((currentValues) => {
      const currentCollection = Array.isArray(currentValues[collectionKey]) ? currentValues[collectionKey] : [];
      if (nextIndex >= currentCollection.length || itemIndex >= currentCollection.length) {
        return currentValues;
      }

      const nextCollection = [...currentCollection];
      const [movedItem] = nextCollection.splice(itemIndex, 1);
      nextCollection.splice(nextIndex, 0, movedItem);

      return {
        ...currentValues,
        [collectionKey]: nextCollection,
      };
    });
  };

  const addAmenityItem = () => {
    const nextAmenityIndex = editorValues.amenities.length;
    if (nextAmenityIndex >= MAX_WEBSITE_CONFIGURABLE_AMENITIES) {
      return;
    }

    setPreviewTargetId(EDITOR_TARGET_KEYS.amenities(nextAmenityIndex));
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenities: [
        ...currentValues.amenities,
        createAmenityEditorItem(amenityIconOptions, currentValues.amenities.length),
      ],
    }));

    runAfterNextPaint(() => {
      focusEditorTarget({
        sectionId: EDITOR_SECTION_KEYS.amenities,
        targetId: EDITOR_TARGET_KEYS.amenities(nextAmenityIndex),
      });
    });
  };

  const removeAmenityItem = (itemIndex) => {
    setPreviewTargetId("visibility.amenitiesPanel");
    setEditorValues((currentValues) => ({
      ...currentValues,
      amenities: currentValues.amenities.filter((_, currentIndex) => currentIndex !== itemIndex),
    }));
  };

  const moveAmenityItemUp = (itemIndex) => {
    moveCollectionItem(EDITOR_SECTION_KEYS.amenities, itemIndex, itemIndex - 1);
  };

  const moveAmenityItemDown = (itemIndex) => {
    moveCollectionItem(EDITOR_SECTION_KEYS.amenities, itemIndex, itemIndex + 1);
  };

  return {
    addAmenityItem,
    closeIconPicker,
    handleCollectionFieldChange,
    iconPickerState,
    moveAmenityItemDown,
    moveAmenityItemUp,
    openIconPicker,
    removeAmenityItem,
    selectIconFromPicker,
  };
};
