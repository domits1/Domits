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

const getHiddenCursorPosition = (canvasRect) => ({
  x: canvasRect.width * HIDDEN_CURSOR_OFFSET.xRatio,
  y: canvasRect.height * HIDDEN_CURSOR_OFFSET.yRatio,
});

const getAvailableSteps = (interactionConfig, targetPositions) =>
  interactionConfig.steps.filter((step) => targetPositions[step.targetId]);

const getMeasuredTargetPositions = (canvasNode, canvasBounds) => {
  const nextTargetPositions = {};

  canvasNode.querySelectorAll("[data-template-target]").forEach((targetElement) => {
    const targetId = targetElement.dataset.templateTarget;

    if (!targetId) {
      return;
    }

    const targetBounds = targetElement.getBoundingClientRect();
    nextTargetPositions[targetId] = {
      x: targetBounds.left - canvasBounds.left + targetBounds.width / 2,
      y: targetBounds.top - canvasBounds.top + targetBounds.height / 2,
    };
  });

  return nextTargetPositions;
};

const measureCanvasTargets = (canvasNode) => {
  const canvasBounds = canvasNode.getBoundingClientRect();

  return {
    canvasRect: {
      width: canvasBounds.width,
      height: canvasBounds.height,
    },
    targetPositions: getMeasuredTargetPositions(canvasNode, canvasBounds),
  };
};

const observeCanvasTargets = (canvasNode, onMeasure) => {
  if (typeof globalThis.ResizeObserver !== "function") {
    return null;
  }

  const resizeObserver = new globalThis.ResizeObserver(onMeasure);
  resizeObserver.observe(canvasNode);
  canvasNode.querySelectorAll("[data-template-target]").forEach((targetElement) => {
    resizeObserver.observe(targetElement);
  });

  return resizeObserver;
};

const createSequenceScheduler = (isCancelledRef) => {
  const timeoutIds = [];

  const schedule = (delayMs, callback) => {
    const timeoutId = globalThis.setTimeout(() => {
      if (!isCancelledRef.current) {
        callback();
      }
    }, delayMs);

    timeoutIds.push(timeoutId);
  };

  const clear = () => {
    timeoutIds.forEach((timeoutId) => globalThis.clearTimeout(timeoutId));
  };

  return { schedule, clear };
};

const setHiddenCursor = (setCursorState, hiddenCursorPosition, visible) => {
  setCursorState(createCursorState(hiddenCursorPosition, visible));
};

const setCursorTarget = (setCursorState, targetPosition, targetId = null) => {
  setCursorState(createCursorState(targetPosition, true, targetId));
};

const scheduleNextSequence = (sequenceState) => {
  const { hiddenCursorPosition, interactionConfig, scheduler, setCursorState } = sequenceState;
  setHiddenCursor(setCursorState, hiddenCursorPosition, false);
  scheduler.schedule(interactionConfig.loopPauseMs, () => startCursorSequence(sequenceState));
};

const scheduleStepActivation = (sequenceState, step, targetPosition, nextStepIndex) => {
  const { interactionConfig, scheduler, setCursorState } = sequenceState;

  scheduler.schedule(interactionConfig.moveDurationMs, () => {
    setCursorTarget(setCursorState, targetPosition, step.targetId);
    scheduler.schedule(step.holdMs ?? interactionConfig.moveDurationMs, () =>
      scheduleStepMove(sequenceState, nextStepIndex)
    );
  });
};

function scheduleStepMove(sequenceState, stepIndex) {
  const { availableSteps, hiddenCursorPosition, setCursorState, targetPositions } = sequenceState;

  if (stepIndex >= availableSteps.length) {
    scheduleNextSequence(sequenceState);
    return;
  }

  const step = availableSteps[stepIndex];
  const targetPosition = targetPositions[step.targetId];

  if (!targetPosition) {
    scheduleStepMove(sequenceState, stepIndex + 1);
    return;
  }

  setHiddenCursor(setCursorState, hiddenCursorPosition, true);
  setCursorTarget(setCursorState, targetPosition);
  scheduleStepActivation(sequenceState, step, targetPosition, stepIndex + 1);
}

function startCursorSequence(sequenceState) {
  const { hiddenCursorPosition, interactionConfig, scheduler, setCursorState } = sequenceState;

  setHiddenCursor(setCursorState, hiddenCursorPosition, false);
  scheduler.schedule(interactionConfig.entryDelayMs, () => {
    setHiddenCursor(setCursorState, hiddenCursorPosition, true);
    scheduler.schedule(40, () => scheduleStepMove(sequenceState, 0));
  });
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  );

  useEffect(() => {
    const mediaQueryList = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");

    if (!mediaQueryList || typeof mediaQueryList.addEventListener !== "function") {
      return undefined;
    }

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

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
      const nextMeasurements = measureCanvasTargets(canvasNode);
      setCanvasRect(nextMeasurements.canvasRect);
      setTargetPositions(nextMeasurements.targetPositions);
    };

    measureTargets();

    const resizeObserver = observeCanvasTargets(canvasNode, measureTargets);
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

    const availableSteps = getAvailableSteps(interactionConfig, targetPositions);

    if (availableSteps.length === 0) {
      setCursorState(createCursorState(getHiddenCursorPosition(canvasRect), false));
      return undefined;
    }

    const isCancelledRef = { current: false };
    const scheduler = createSequenceScheduler(isCancelledRef);

    startCursorSequence({
      availableSteps,
      hiddenCursorPosition: getHiddenCursorPosition(canvasRect),
      interactionConfig,
      scheduler,
      setCursorState,
      targetPositions,
    });

    return () => {
      isCancelledRef.current = true;
      scheduler.clear();
    };
  }, [canvasRect, interactionConfig, prefersReducedMotion, targetPositions]);

  const getCanvasProps = ({ className = "", ref: forwardedRef, ...restProps } = {}) => ({
    ...restProps,
    ref: (node) => {
      canvasRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
        return;
      }

      if (forwardedRef && typeof forwardedRef === "object") {
        forwardedRef.current = node;
      }
    },
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
