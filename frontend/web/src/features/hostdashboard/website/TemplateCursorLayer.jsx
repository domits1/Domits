import PropTypes from "prop-types";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReactComponent as CursorIcon } from "../../../images/icons/template-cursor-icon.svg";
import interactionStyles from "./templateInteractions.module.scss";
import { getTemplateInteractionConfig } from "./templateInteractionConfig";

const DEFAULT_CURSOR_POSITION = {
  x: 0,
  y: 0,
};

const HIDDEN_CURSOR_OFFSET = {
  xRatio: 0.82,
  yRatio: 0.16,
};

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(" ");

const createCursorState = (position = DEFAULT_CURSOR_POSITION, visible = false, activeTargetId = null) => ({
  x: position?.x ?? DEFAULT_CURSOR_POSITION.x,
  y: position?.y ?? DEFAULT_CURSOR_POSITION.y,
  visible,
  activeTargetId,
});

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );

  useEffect(() => {
    const mediaQueryList = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (!mediaQueryList) {
      return undefined;
    }

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === "function") {
      mediaQueryList.addEventListener("change", handleChange);
      return () => mediaQueryList.removeEventListener("change", handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, []);

  return prefersReducedMotion;
}

const getHiddenCursorPosition = (canvasRect) => ({
  x: canvasRect.width * HIDDEN_CURSOR_OFFSET.xRatio,
  y: canvasRect.height * HIDDEN_CURSOR_OFFSET.yRatio,
});

function TemplateCursorLayer({ layout, children }) {
  const interactionConfig = getTemplateInteractionConfig(layout);
  const prefersReducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef(null);
  const [canvasRect, setCanvasRect] = useState(null);
  const [targetPositions, setTargetPositions] = useState({});
  const [cursorState, setCursorState] = useState(() => createCursorState());

  useLayoutEffect(() => {
    const canvasNode = canvasRef.current;

    if (!canvasNode) {
      setCanvasRect(null);
      setTargetPositions({});
      return undefined;
    }

    const measureTargets = () => {
      const canvasBounds = canvasNode.getBoundingClientRect();
      const nextCanvasRect = {
        width: canvasBounds.width,
        height: canvasBounds.height,
      };

      const targetElements = Array.from(canvasNode.querySelectorAll("[data-template-target]"));
      const nextTargetPositions = {};

      targetElements.forEach((targetElement) => {
        const targetId = targetElement.getAttribute("data-template-target");

        if (!targetId) {
          return;
        }

        const targetBounds = targetElement.getBoundingClientRect();
        nextTargetPositions[targetId] = {
          x: targetBounds.left - canvasBounds.left + targetBounds.width / 2,
          y: targetBounds.top - canvasBounds.top + targetBounds.height / 2,
        };
      });

      setCanvasRect(nextCanvasRect);
      setTargetPositions(nextTargetPositions);
    };

    measureTargets();

    const resizeObserver =
      typeof globalThis.ResizeObserver === "function" ? new globalThis.ResizeObserver(measureTargets) : null;

    if (resizeObserver) {
      resizeObserver.observe(canvasNode);
      canvasNode.querySelectorAll("[data-template-target]").forEach((targetElement) => {
        resizeObserver.observe(targetElement);
      });
    }

    globalThis.addEventListener("resize", measureTargets);

    return () => {
      resizeObserver?.disconnect();
      globalThis.removeEventListener("resize", measureTargets);
    };
  }, [layout]);

  useEffect(() => {
    if (!canvasRect) {
      setCursorState(createCursorState());
      return undefined;
    }

    if (!interactionConfig || prefersReducedMotion) {
      setCursorState(createCursorState(getHiddenCursorPosition(canvasRect), false));
      return undefined;
    }

    const availableSteps = interactionConfig.steps.filter((step) => targetPositions[step.targetId]);

    if (availableSteps.length === 0) {
      setCursorState(createCursorState(getHiddenCursorPosition(canvasRect), false));
      return undefined;
    }

    let isCancelled = false;
    const timeoutIds = [];

    const schedule = (delayMs, callback) => {
      const timeoutId = globalThis.setTimeout(() => {
        if (!isCancelled) {
          callback();
        }
      }, delayMs);

      timeoutIds.push(timeoutId);
    };

    const hiddenCursorPosition = getHiddenCursorPosition(canvasRect);

    const moveToStep = (stepIndex) => {
      if (stepIndex >= availableSteps.length) {
        setCursorState(createCursorState(hiddenCursorPosition, false));
        schedule(interactionConfig.loopPauseMs, runSequence);
        return;
      }

      const step = availableSteps[stepIndex];
      const targetPosition = targetPositions[step.targetId];

      if (!targetPosition) {
        moveToStep(stepIndex + 1);
        return;
      }

      setCursorState((currentState) =>
        createCursorState(
          {
            x: targetPosition.x,
            y: targetPosition.y,
          },
          currentState.visible,
          null
        )
      );

      schedule(interactionConfig.moveDurationMs, () => {
        setCursorState((currentState) => ({
          ...currentState,
          visible: true,
          activeTargetId: step.targetId,
        }));

        schedule(step.holdMs ?? interactionConfig.moveDurationMs, () => moveToStep(stepIndex + 1));
      });
    };

    const runSequence = () => {
      setCursorState(createCursorState(hiddenCursorPosition, false));
      schedule(interactionConfig.entryDelayMs, () => {
        setCursorState(createCursorState(hiddenCursorPosition, true));
        schedule(40, () => moveToStep(0));
      });
    };

    runSequence();

    return () => {
      isCancelled = true;
      timeoutIds.forEach((timeoutId) => globalThis.clearTimeout(timeoutId));
    };
  }, [canvasRect, interactionConfig, prefersReducedMotion, targetPositions]);

  const getCanvasProps = ({ className = "", ...restProps } = {}) => ({
    ...restProps,
    ref: canvasRef,
    className,
  });

  const getTargetProps = (targetId, className = "", extraProps = {}) => ({
    ...extraProps,
    "data-template-target": targetId,
    className: joinClassNames(
      className,
      interactionStyles.templateInteractiveTarget,
      cursorState.activeTargetId === targetId ? interactionStyles.templateInteractiveTargetActive : ""
    ),
  });

  const cursor = prefersReducedMotion || !interactionConfig || !canvasRect ? null : (
    <span
      className={joinClassNames(
        interactionStyles.templateCursor,
        cursorState.visible ? interactionStyles.templateCursorVisible : ""
      )}
      style={{
        "--template-cursor-x": `${cursorState.x}px`,
        "--template-cursor-y": `${cursorState.y}px`,
        "--template-cursor-move-duration": `${interactionConfig.moveDurationMs}ms`,
      }}
      aria-hidden="true"
    >
      <CursorIcon className={interactionStyles.templateCursorIcon} focusable="false" />
    </span>
  );

  return children({ getCanvasProps, getTargetProps, cursor });
}

TemplateCursorLayer.propTypes = {
  layout: PropTypes.string.isRequired,
  children: PropTypes.func.isRequired,
};

export default TemplateCursorLayer;
