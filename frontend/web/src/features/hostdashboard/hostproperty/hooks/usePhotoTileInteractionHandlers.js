import { useCallback, useEffect, useRef } from "react";
import {
  PHOTO_REORDER_KEY_DELTAS,
  PHOTO_REORDER_LONG_PRESS_MS,
  PHOTO_REORDER_MOVE_CANCEL_PX,
} from "../constants";
import { createInitialTouchReorderState } from "../utils/hostPropertyUtils";

export const usePhotoTileInteractionHandlers = ({
  displayedPhotos,
  onPhotoTileDragStart,
  onPhotoTileDragOver,
  onPhotoTileDragEnd,
  onPhotoTileDrop,
  saving,
  deletingPhoto,
}) => {
  const touchReorderRef = useRef(createInitialTouchReorderState());

  const clearTouchReorderTimer = useCallback(() => {
    const timerId = touchReorderRef.current.timerId;
    if (!timerId) {
      return;
    }
    clearTimeout(timerId);
    touchReorderRef.current.timerId = null;
  }, []);

  const resetTouchReorderState = useCallback(() => {
    clearTouchReorderTimer();
    touchReorderRef.current.pointerId = null;
    touchReorderRef.current.sourcePhotoId = null;
    touchReorderRef.current.targetPhotoId = null;
    touchReorderRef.current.started = false;
    touchReorderRef.current.startX = 0;
    touchReorderRef.current.startY = 0;
  }, [clearTouchReorderTimer]);

  const resolveDropTargetPhotoId = useCallback((event) => {
    if (typeof document === "undefined") {
      return null;
    }
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const targetTile = element?.closest("[data-photo-id]");
    return targetTile?.dataset?.photoId || null;
  }, []);

  const handlePhotoTilePointerDown = useCallback((photoId, event) => {
    if (event.pointerType === "mouse" || saving) {
      return;
    }
    if (touchReorderRef.current.pointerId !== null) {
      return;
    }
    const interactiveTarget = event.target?.closest("button, input, textarea, select, a, [role='button']");
    if (interactiveTarget && interactiveTarget !== event.currentTarget) {
      return;
    }

    clearTouchReorderTimer();
    touchReorderRef.current.pointerId = event.pointerId;
    touchReorderRef.current.sourcePhotoId = photoId;
    touchReorderRef.current.targetPhotoId = photoId;
    touchReorderRef.current.started = false;
    touchReorderRef.current.startX = event.clientX;
    touchReorderRef.current.startY = event.clientY;
    touchReorderRef.current.timerId = setTimeout(() => {
      touchReorderRef.current.started = true;
      onPhotoTileDragStart(photoId);
      onPhotoTileDragOver(photoId);
    }, PHOTO_REORDER_LONG_PRESS_MS);
  }, [clearTouchReorderTimer, onPhotoTileDragOver, onPhotoTileDragStart, saving]);

  const handlePhotoTilePointerMove = useCallback((event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touchReorderState = touchReorderRef.current;
    if (touchReorderState.pointerId !== event.pointerId) {
      return;
    }

    if (!touchReorderState.started) {
      const deltaX = event.clientX - touchReorderState.startX;
      const deltaY = event.clientY - touchReorderState.startY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > PHOTO_REORDER_MOVE_CANCEL_PX) {
        resetTouchReorderState();
      }
      return;
    }

    event.preventDefault();
    const targetPhotoId = resolveDropTargetPhotoId(event) || touchReorderState.sourcePhotoId;
    if (!targetPhotoId) {
      return;
    }
    touchReorderState.targetPhotoId = targetPhotoId;
    onPhotoTileDragOver(targetPhotoId);
  }, [onPhotoTileDragOver, resetTouchReorderState, resolveDropTargetPhotoId]);

  const handlePhotoTilePointerUp = useCallback((event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touchReorderState = touchReorderRef.current;
    if (touchReorderState.pointerId !== event.pointerId) {
      return;
    }
    clearTouchReorderTimer();
    if (!touchReorderState.started) {
      resetTouchReorderState();
      return;
    }

    event.preventDefault();
    const targetPhotoId =
      resolveDropTargetPhotoId(event) || touchReorderState.targetPhotoId || touchReorderState.sourcePhotoId;
    if (targetPhotoId) {
      onPhotoTileDrop(targetPhotoId);
    }
    onPhotoTileDragEnd();
    resetTouchReorderState();
  }, [clearTouchReorderTimer, onPhotoTileDragEnd, onPhotoTileDrop, resetTouchReorderState, resolveDropTargetPhotoId]);

  const handlePhotoTilePointerCancel = useCallback((event) => {
    if (event.pointerType === "mouse") {
      return;
    }
    const touchReorderState = touchReorderRef.current;
    if (touchReorderState.pointerId !== event.pointerId) {
      return;
    }
    if (touchReorderState.started) {
      onPhotoTileDragEnd();
    }
    resetTouchReorderState();
  }, [onPhotoTileDragEnd, resetTouchReorderState]);

  const movePhotoByKeyboard = useCallback((photoId, delta) => {
    const fromIndex = displayedPhotos.findIndex((photo) => photo.id === photoId);
    if (fromIndex === -1) {
      return;
    }
    const toIndex = Math.max(0, Math.min(displayedPhotos.length - 1, fromIndex + delta));
    if (toIndex === fromIndex) {
      return;
    }
    const targetPhotoId = displayedPhotos[toIndex]?.id;
    if (!targetPhotoId || targetPhotoId === photoId) {
      return;
    }
    onPhotoTileDragStart(photoId);
    onPhotoTileDrop(targetPhotoId);
    onPhotoTileDragEnd();
  }, [displayedPhotos, onPhotoTileDragEnd, onPhotoTileDragStart, onPhotoTileDrop]);

  const handlePhotoTileKeyDown = useCallback((photoId, event) => {
    if (saving || deletingPhoto) {
      return;
    }
    const delta = PHOTO_REORDER_KEY_DELTAS[event.key];
    if (delta === undefined) {
      return;
    }
    event.preventDefault();
    movePhotoByKeyboard(photoId, delta);
  }, [deletingPhoto, movePhotoByKeyboard, saving]);

  useEffect(() => {
    return () => {
      clearTouchReorderTimer();
    };
  }, [clearTouchReorderTimer]);

  return {
    handlePhotoTilePointerDown,
    handlePhotoTilePointerMove,
    handlePhotoTilePointerUp,
    handlePhotoTilePointerCancel,
    handlePhotoTileKeyDown,
  };
};