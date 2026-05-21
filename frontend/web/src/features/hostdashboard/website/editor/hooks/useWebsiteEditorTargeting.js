import { useCallback, useEffect, useRef, useState } from "react";
import { EDITOR_SECTION_KEYS } from "../../websiteEditorConfig";
import {
  activatePreviewTargetId as activatePreviewTargetIdHelper,
  activateTemporaryPreviewTargetId as activateTemporaryPreviewTargetIdHelper,
  clearPreviewTargetResetTimeout,
  EDITOR_SECTION_EXPAND_SCROLL_RETRY_DELAY_MS,
  EDITOR_TARGET_FOCUS_MAX_ATTEMPTS,
  getCenteredContainerScrollTop,
  resolveEditorPreviewTargetId,
  resolveSectionNode,
  runAfterNextPaint,
} from "../websiteEditorUtils";

const SECTION_HIGHLIGHT_RESET_DURATION_MS = 1800;
const IMAGE_PICKER_OPEN_DELAY_MS = 140;

export const useWebsiteEditorTargeting = ({
  editorPanelRef,
  expandedSections,
  onSelectImageSlot,
  setExpandedSections,
}) => {
  const [highlightedTargetId, setHighlightedTargetId] = useState("");
  const [activePreviewTargetId, setActivePreviewTargetId] = useState("");
  const sectionRefs = useRef({});
  const targetRefs = useRef({});
  const sectionHighlightResetTimeoutRef = useRef(null);
  const previewHighlightResetTimeoutRef = useRef(null);
  const editorTargetFocusRequestRef = useRef(0);

  useEffect(
    () => () => {
      if (sectionHighlightResetTimeoutRef.current) {
        globalThis.clearTimeout(sectionHighlightResetTimeoutRef.current);
      }

      clearPreviewTargetResetTimeout(previewHighlightResetTimeoutRef);
    },
    []
  );

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [sectionId]: !currentSections[sectionId],
    }));
  }, [setExpandedSections]);

  const openSection = useCallback((sectionId) => {
    setExpandedSections((currentSections) => {
      if (currentSections[sectionId]) {
        return currentSections;
      }

      return {
        ...currentSections,
        [sectionId]: true,
      };
    });
  }, [setExpandedSections]);

  const setSectionRef = useCallback((sectionId) => (node) => {
    sectionRefs.current[sectionId] = node;
  }, []);

  const setTargetRef = useCallback((targetId) => (node) => {
    targetRefs.current[targetId] = node;
  }, []);

  const scrollEditorNodeIntoView = useCallback((node) => {
    const centeredScrollTop = getCenteredContainerScrollTop(node, editorPanelRef.current);
    if (centeredScrollTop !== null && editorPanelRef.current) {
      editorPanelRef.current.scrollTo({
        top: centeredScrollTop,
        behavior: "smooth",
      });
      return true;
    }

    node?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    return Boolean(node);
  }, [editorPanelRef]);

  const focusEditorTarget = useCallback(({
    sectionId,
    targetId,
  }) => {
    if (!sectionId) {
      return;
    }

    const wasSectionCollapsed = expandedSections[sectionId] !== true;
    openSection(sectionId);
    setHighlightedTargetId("");

    const resolvedTargetId = resolveEditorPreviewTargetId({ sectionId, targetId });
    const focusRequestId = editorTargetFocusRequestRef.current + 1;
    editorTargetFocusRequestRef.current = focusRequestId;

    globalThis.setTimeout(() => {
      if (resolvedTargetId && editorTargetFocusRequestRef.current === focusRequestId) {
        setHighlightedTargetId(resolvedTargetId);
      }
    }, 0);

    if (sectionHighlightResetTimeoutRef.current) {
      globalThis.clearTimeout(sectionHighlightResetTimeoutRef.current);
    }

    sectionHighlightResetTimeoutRef.current = globalThis.setTimeout(() => {
      if (editorTargetFocusRequestRef.current === focusRequestId) {
        setHighlightedTargetId("");
      }
    }, SECTION_HIGHLIGHT_RESET_DURATION_MS);

    const attemptFocus = (attemptIndex = 0) => {
      if (editorTargetFocusRequestRef.current !== focusRequestId) {
        return;
      }

      const targetEditorNode = resolvedTargetId
        ? resolveSectionNode(targetRefs.current[resolvedTargetId])
        : null;
      if (targetEditorNode) {
        scrollEditorNodeIntoView(targetEditorNode);
        return;
      }

      if (attemptIndex >= EDITOR_TARGET_FOCUS_MAX_ATTEMPTS) {
        scrollEditorNodeIntoView(resolveSectionNode(sectionRefs.current[sectionId]));
        return;
      }

      runAfterNextPaint(() => {
        attemptFocus(attemptIndex + 1);
      });
    };

    runAfterNextPaint(() => {
      attemptFocus();
    });

    if (wasSectionCollapsed) {
      globalThis.setTimeout(() => {
        if (editorTargetFocusRequestRef.current !== focusRequestId) {
          return;
        }

        attemptFocus();
      }, EDITOR_SECTION_EXPAND_SCROLL_RETRY_DELAY_MS);
    }
  }, [expandedSections, openSection, scrollEditorNodeIntoView]);

  const handlePreviewTargetSelect = useCallback(({
    sectionId,
    targetId,
    imageSlot,
  } = {}) => {
    if (imageSlot) {
      const targetSectionId = sectionId || EDITOR_SECTION_KEYS.images;
      focusEditorTarget({
        sectionId: targetSectionId,
        targetId: targetId || resolveEditorPreviewTargetId({ imageSlot, sectionId: targetSectionId }),
      });
      globalThis.setTimeout(() => {
        onSelectImageSlot?.(imageSlot);
      }, IMAGE_PICKER_OPEN_DELAY_MS);
      return;
    }

    if (sectionId) {
      focusEditorTarget({ sectionId, targetId });
    }
  }, [focusEditorTarget, onSelectImageSlot]);

  const setPreviewTargetId = useCallback((targetId) => {
    activatePreviewTargetIdHelper(setActivePreviewTargetId, targetId);
  }, []);

  const flashPreviewTarget = useCallback((targetId, durationMs) => {
    activateTemporaryPreviewTargetIdHelper(
      setActivePreviewTargetId,
      previewHighlightResetTimeoutRef,
      targetId,
      durationMs
    );
  }, []);

  const activatePreviewTarget = useCallback((targetId) => () => {
    setPreviewTargetId(targetId);
  }, [setPreviewTargetId]);

  const clearActivePreviewTarget = useCallback(() => {
    clearPreviewTargetResetTimeout(previewHighlightResetTimeoutRef);
    setActivePreviewTargetId("");
  }, []);

  return {
    activePreviewTargetId,
    activatePreviewTarget,
    clearActivePreviewTarget,
    flashPreviewTarget,
    focusEditorTarget,
    handlePreviewTargetSelect,
    highlightedTargetId,
    setPreviewTargetId,
    setSectionRef,
    setTargetRef,
    toggleSection,
  };
};
