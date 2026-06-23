import { useCallback } from "react";
import { toast } from "react-toastify";
import {
  WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
  WEBSITE_CONTACT_AVATAR_MODE_HOST,
  WEBSITE_CONTACT_AVATAR_MODE_INITIALS,
  resolveWebsiteContactAvatarMode,
} from "../../config/websiteContactSectionConfig";
import { getImageSlotTargetId, EDITOR_TARGET_KEYS } from "../../websiteEditorConfig";
import { setWebsiteImageSlotRotationEnabled } from "../../rendering/websiteImageSlotUtils";
import { buildNextEditorImageState } from "../WebsiteEditorPageSupport";
import { normalizeUiErrorMessage, readImageFileAsDataUrl } from "../websiteEditorUtils";

const EMPTY_IMAGE_PICKER_STATE = Object.freeze({
  isOpen: false,
  slot: null,
});

export const useWebsiteEditorAssets = ({
  imagePickerState,
  importedImageOptions,
  setEditorValues,
  setImagePickerState,
  setPreviewTargetId,
}) => {
  const updateContactAvatarMode = useCallback((avatarMode) => {
    setPreviewTargetId(EDITOR_TARGET_KEYS.contact.avatarImage);
    setEditorValues((currentValues) => ({
      ...currentValues,
      contact: {
        ...currentValues.contact,
        avatarMode: resolveWebsiteContactAvatarMode(avatarMode, WEBSITE_CONTACT_AVATAR_MODE_HOST),
        avatarImage: "",
      },
    }));
  }, [setEditorValues, setPreviewTargetId]);

  const handleContactImageFileChange = useCallback(async (event) => {
    const nextFile = event.target.files?.[0];
    event.target.value = "";

    if (!nextFile) {
      return;
    }

    setPreviewTargetId(EDITOR_TARGET_KEYS.contact.avatarImage);

    try {
      const nextAvatarImage = await readImageFileAsDataUrl(nextFile);
      setEditorValues((currentValues) => ({
        ...currentValues,
        contact: {
          ...currentValues.contact,
          avatarMode: WEBSITE_CONTACT_AVATAR_MODE_CUSTOM,
          avatarImage: nextAvatarImage,
        },
      }));
    } catch (error) {
      toast.error(
        normalizeUiErrorMessage(error?.message, "We could not upload that image for the contact footer.")
      );
    }
  }, [setEditorValues, setPreviewTargetId]);

  const handleContactImageUseInitials = useCallback(() => {
    updateContactAvatarMode(WEBSITE_CONTACT_AVATAR_MODE_INITIALS);
  }, [updateContactAvatarMode]);

  const handleContactImageUseProfilePhoto = useCallback(() => {
    updateContactAvatarMode(WEBSITE_CONTACT_AVATAR_MODE_HOST);
  }, [updateContactAvatarMode]);

  const updateImageSlotSelection = useCallback((slot, nextValue) => {
    if (!slot) {
      return;
    }

    setPreviewTargetId(getImageSlotTargetId(slot));
    setEditorValues((currentValues) => buildNextEditorImageState(currentValues, slot, nextValue));
  }, [setEditorValues, setPreviewTargetId]);

  const openImagePicker = useCallback((slot) => {
    if (!slot || importedImageOptions.length < 1) {
      return;
    }

    setPreviewTargetId(getImageSlotTargetId(slot));
    setImagePickerState({
      isOpen: true,
      slot,
    });
  }, [importedImageOptions.length, setImagePickerState, setPreviewTargetId]);

  const closeImagePicker = useCallback(() => {
    setImagePickerState(EMPTY_IMAGE_PICKER_STATE);
  }, [setImagePickerState]);

  const selectImageFromPicker = useCallback((imageUrl) => {
    if (!imagePickerState.slot || !imageUrl) {
      return;
    }

    updateImageSlotSelection(imagePickerState.slot, imageUrl);
    closeImagePicker();
  }, [closeImagePicker, imagePickerState.slot, updateImageSlotSelection]);

  const updateImageSlotRotation = useCallback((slot, nextEnabled) => {
    if (!slot) {
      return;
    }

    setPreviewTargetId(getImageSlotTargetId(slot));
    setEditorValues((currentValues) => ({
      ...currentValues,
      images: {
        ...currentValues.images,
        rotation: setWebsiteImageSlotRotationEnabled(
          currentValues?.images?.rotation,
          slot,
          nextEnabled,
          currentValues?.images?.gallery?.length
        ),
      },
    }));
  }, [setEditorValues, setPreviewTargetId]);

  return {
    closeImagePicker,
    handleContactImageFileChange,
    handleContactImageUseInitials,
    handleContactImageUseProfilePhoto,
    openImagePicker,
    selectImageFromPicker,
    updateImageSlotRotation,
  };
};
