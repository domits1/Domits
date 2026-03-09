import React from "react";

export const useDismissOnOutsideMouseDown = ({ isOpen, modalContentRef, onDismiss }) => {
  React.useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleMouseDown = (event) => {
      const modalContent = modalContentRef.current;
      if (!modalContent) {
        return;
      }
      const eventTarget = event.target;
      if (eventTarget instanceof Node && !modalContent.contains(eventTarget)) {
        onDismiss();
      }
    };
    globalThis.addEventListener("mousedown", handleMouseDown);
    return () => {
      globalThis.removeEventListener("mousedown", handleMouseDown);
    };
  }, [isOpen, modalContentRef, onDismiss]);
};

export const useShowModalEffect = (isOpen, dialogRef) => {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) {
      return;
    }
    try {
      dialog.showModal();
    } catch {
      // no-op: prevents runtime crash if showModal is called during rapid unmounts
    }
  }, [isOpen, dialogRef]);
};
