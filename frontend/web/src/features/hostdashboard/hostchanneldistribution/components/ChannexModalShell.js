import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Shared accessible dialog shell for the Distribution tab's connect/reconnect/disconnect
// modals. Focuses the dialog (or initialFocusRef) on open, restores focus to whatever triggered
// it on close, traps Tab within the dialog, and closes on Escape or a backdrop click -- unless
// closeDisabled is set, so a host can't dismiss it mid-request.
function ChannexModalShell({ titleId, title, onClose, closeDisabled = false, initialFocusRef = null, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const target = initialFocusRef?.current || dialogRef.current;
    target?.focus();

    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
    // Runs once on mount/unmount only; initialFocusRef is a stable ref, not reactive state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (closeDisabled) return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, closeDisabled]);

  const handleBackdropMouseDown = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <div className="chdist-modal-backdrop" onMouseDown={handleBackdropMouseDown}>
      <div
        className="chdist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="chdist-modal__header">
          <h3 className="chdist-modal__title" id={titleId}>
            {title}
          </h3>
          <button
            type="button"
            className="chdist-modal__close"
            aria-label="Close"
            onClick={onClose}
            disabled={closeDisabled}
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

ChannexModalShell.propTypes = {
  titleId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  closeDisabled: PropTypes.bool,
  initialFocusRef: PropTypes.shape({ current: PropTypes.any }),
  children: PropTypes.node.isRequired,
};

export default ChannexModalShell;
