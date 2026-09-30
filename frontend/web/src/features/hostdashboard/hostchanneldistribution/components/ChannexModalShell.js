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
      const last = focusable.at(-1);

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

  return (
    <div className="chdist-modal-backdrop">
      {/*
        A real <button>, not a div with a mouse handler: native keyboard support comes for free
        from the element type, which is what actually satisfies "non-interactive element without
        keyboard support" rather than just relocating the problem. Taken out of the tab order
        since it's redundant with Escape and the explicit close button below -- it exists purely
        so a mouse/touch user can dismiss by clicking outside the card. Deliberately NOT
        aria-hidden: that combined with a focusable element (tabIndex={-1} is still
        programmatically focusable, just not Tab-reachable) is its own accessibility anti-pattern.
        Sibling of .chdist-modal, not its parent, so a click on the card never needs to stop
        propagation through an element that carries role="dialog".
      */}
      <button
        type="button"
        className="chdist-modal-backdrop__overlay"
        aria-label="Close backdrop"
        tabIndex={-1}
        disabled={closeDisabled}
        onClick={onClose}
      />
      {/*
        A native <dialog> (with showModal()/close()) is the better primitive here, but this
        project's test toolchain (react-scripts 5.0.1 -> jest-environment-jsdom -> pinned
        jsdom@^16.6.0, installed 16.7.0) implements HTMLDialogElement as a bare HTMLElement
        passthrough -- no showModal, close, open-state handling, ::backdrop, or cancel/close
        events. Calling showModal() here would throw in every test that mounts a modal. Revisit
        once the jsdom version this project's jest environment resolves supports it.
      */}
      <div
        className="chdist-modal"
        role="dialog" // NOSONAR: kept intentionally -- see the jsdom explanation just above.
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        tabIndex={-1}
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
