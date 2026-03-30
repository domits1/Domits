import PropTypes from "prop-types";
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./WebsiteBuilderPage.module.scss";
import TemplateCursorLayer from "./TemplateCursorLayer";
import { WEBSITE_TEMPLATE_LAYOUTS } from "./websiteTemplates";
import { getTemplateSilhouetteLayout } from "./templateSilhouetteLayouts";

const TEMPLATE_CANVAS_BASE_WIDTH = 188;

function TemplateSilhouette({ layout }) {
  const silhouetteLayout = getTemplateSilhouetteLayout(layout);
  const { canvasClassName, Component } = silhouetteLayout;
  const viewportRef = useRef(null);
  const [canvasScale, setCanvasScale] = useState(1);

  useLayoutEffect(() => {
    const viewportNode = viewportRef.current;

    if (!viewportNode) {
      return undefined;
    }

    const updateCanvasScale = () => {
      const nextWidth = viewportNode.getBoundingClientRect().width;
      const nextScale = Math.min(1, nextWidth / TEMPLATE_CANVAS_BASE_WIDTH);
      setCanvasScale(nextScale || 1);
    };

    updateCanvasScale();

    const resizeObserver =
      typeof globalThis.ResizeObserver === "function" ? new globalThis.ResizeObserver(updateCanvasScale) : null;

    resizeObserver?.observe(viewportNode);
    globalThis.addEventListener("resize", updateCanvasScale);

    return () => {
      resizeObserver?.disconnect();
      globalThis.removeEventListener("resize", updateCanvasScale);
    };
  }, []);

  return (
    <TemplateCursorLayer layout={layout}>
      {({ getCanvasProps, getTargetProps, cursor }) => (
        <div
          {...getCanvasProps({
            className: styles.templateCanvasViewport,
            "aria-hidden": "true",
            ref: viewportRef,
            style: {
              "--template-canvas-scale": canvasScale,
            },
          })}
        >
          <div className={`${styles.templateCanvas} ${canvasClassName}`}>
            <Component getTargetProps={getTargetProps} />
          </div>
          {cursor}
        </div>
      )}
    </TemplateCursorLayer>
  );
}

TemplateSilhouette.propTypes = {
  layout: PropTypes.oneOf(WEBSITE_TEMPLATE_LAYOUTS).isRequired,
};

export default TemplateSilhouette;
