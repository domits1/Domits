import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./WebsiteTemplatePreview.module.scss";
import motionStyles from "./animations/WebsiteTemplateMotion.module.scss";
import { useWebsiteScrollReveal } from "./animations/useWebsiteScrollReveal";
import { getWebsiteTemplateById } from "../websiteTemplates";
import { getWebsiteTemplateRenderer } from "./templateRegistry";
import WebsiteContactWidget from "./WebsiteContactWidget";
import { resolveWebsiteBackgroundColor } from "./websiteDraftThemeOverrides";

const PREVIEW_VIEWPORT_WIDTHS = Object.freeze({
  desktop: 1180,
  tablet: 834,
  mobile: 390,
});
const TEMPLATE_PREVIEW_VIEWPORT_WIDTHS = Object.freeze({
  "panorama-landing": Object.freeze({
    desktop: 1440,
  }),
});

const DEFAULT_SCALE_METRICS = Object.freeze({
  scale: 1,
  height: null,
});
const COMPACT_PREVIEW_WIDTH = 184;
const COMPACT_PREVIEW_MAX_HEIGHT = 228;
const COMPACT_PREVIEW_VIEWPORT_WIDTH = 960;

const resolveViewportWidth = (viewport, templateId) => {
  const templateViewportWidths = TEMPLATE_PREVIEW_VIEWPORT_WIDTHS[templateId];
  if (templateViewportWidths?.[viewport]) {
    return templateViewportWidths[viewport];
  }

  return PREVIEW_VIEWPORT_WIDTHS[viewport] || PREVIEW_VIEWPORT_WIDTHS.desktop;
};

const scrollPreviewTargetIntoViewport = (previewTargetNode) => {
  if (!previewTargetNode || typeof previewTargetNode.getBoundingClientRect !== "function") {
    return;
  }

  const targetRect = previewTargetNode.getBoundingClientRect();
  const viewportHeight = globalThis.innerHeight || 0;
  if (viewportHeight < 1) {
    previewTargetNode.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
    return;
  }

  const targetOffset = targetRect.top - (viewportHeight / 2 - targetRect.height / 2);
  if (Math.abs(targetOffset) < 12) {
    return;
  }

  if (typeof globalThis.scrollBy === "function") {
    globalThis.scrollBy({
      top: targetOffset,
      behavior: "smooth",
    });
    return;
  }

  previewTargetNode.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
};

const usePreviewScaleMetrics = (viewportWidth) => {
  const scaleShellRef = useRef(null);
  const scaleInnerRef = useRef(null);
  const [scaleMetrics, setScaleMetrics] = useState(DEFAULT_SCALE_METRICS);

  useEffect(() => {
    const scaleShell = scaleShellRef.current;
    const scaleInner = scaleInnerRef.current;

    if (!scaleShell || !scaleInner || typeof ResizeObserver === "undefined") {
      setScaleMetrics(DEFAULT_SCALE_METRICS);
      return undefined;
    }

    const updateScaleMetrics = () => {
      const availableWidth = scaleShell.clientWidth || viewportWidth;
      const nextScale = availableWidth > 0 ? Math.min(1, availableWidth / viewportWidth) : 1;
      const nextHeight = Math.ceil(scaleInner.scrollHeight * nextScale);

      setScaleMetrics((currentMetrics) => {
        if (
          Math.abs(currentMetrics.scale - nextScale) < 0.001 &&
          currentMetrics.height === nextHeight
        ) {
          return currentMetrics;
        }

        return {
          scale: nextScale,
          height: nextHeight,
        };
      });
    };

    updateScaleMetrics();

    const shellObserver = new ResizeObserver(updateScaleMetrics);
    const innerObserver = new ResizeObserver(updateScaleMetrics);
    shellObserver.observe(scaleShell);
    innerObserver.observe(scaleInner);

    return () => {
      shellObserver.disconnect();
      innerObserver.disconnect();
    };
  }, [viewportWidth]);

  return {
    scaleShellRef,
    scaleInnerRef,
    scaleMetrics,
  };
};

function UnsupportedTemplatePreview({ templateName }) {
  return (
    <div className={styles.previewUnsupported}>
      <h3>Preview not implemented yet</h3>
      <p>
        {templateName} is still a silhouette-only option. Real preview rendering is currently available
        for Panorama Landing, Trust Signals, and Experience Journey.
      </p>
    </div>
  );
}

UnsupportedTemplatePreview.propTypes = {
  templateName: PropTypes.string.isRequired,
};

const websiteTemplatePreviewModelPropType = PropTypes.shape({
  source: PropTypes.shape({
    hostId: PropTypes.string,
    propertyId: PropTypes.string,
  }),
  site: PropTypes.shape({
    title: PropTypes.string,
    templateReadyTitle: PropTypes.string,
  }).isRequired,
  location: PropTypes.shape({
    label: PropTypes.string,
  }).isRequired,
  visibility: PropTypes.shape({
    availabilityCalendar: PropTypes.bool,
    chatWidget: PropTypes.bool,
  }),
  theme: PropTypes.shape({
    backgroundColor: PropTypes.string,
  }),
}).isRequired;

export function WebsiteTemplateSurface({
  templateId,
  model,
  showContactWidget = true,
  showBrowserChrome = true,
  enableScrollReveal = false,
  browserTitle = "",
  onSelectTarget,
  activeTargetId = "",
}) {
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(template.id);
  const previewCanvasRef = useWebsiteScrollReveal({
    enabled: enableScrollReveal,
    deps: [templateId, model],
  });
  const previewCanvasStyle = {
    "--website-surface-background": resolveWebsiteBackgroundColor(model?.theme?.backgroundColor),
  };

  return (
    <div className={styles.previewBrowser}>
      {showBrowserChrome ? (
        <div className={styles.previewBrowserBar}>
          <div className={styles.previewBrowserDots} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.previewBrowserTitle}>{browserTitle || model.site.title || "Website preview"}</div>
        </div>
      ) : null}

      <div
        ref={previewCanvasRef}
        className={`${styles.previewCanvas} ${
          enableScrollReveal ? motionStyles.previewCanvasAnimated : ""
        }`.trim()}
        style={previewCanvasStyle}
      >
        {TemplateComponent ? (
          <TemplateComponent
            model={model}
            onSelectTarget={onSelectTarget}
            activeTargetId={activeTargetId}
          />
        ) : (
          <UnsupportedTemplatePreview templateName={template.name} />
        )}
        {showContactWidget ? <WebsiteContactWidget model={model} /> : null}
      </div>
    </div>
  );
}

WebsiteTemplateSurface.propTypes = {
  templateId: PropTypes.string.isRequired,
  model: websiteTemplatePreviewModelPropType,
  showContactWidget: PropTypes.bool,
  showBrowserChrome: PropTypes.bool,
  enableScrollReveal: PropTypes.bool,
  browserTitle: PropTypes.string,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};

export default function WebsiteTemplatePreview({
  templateId,
  model,
  variant = "default",
  viewport = "desktop",
  showBrowserChrome = false,
  onSelectTarget,
  activeTargetId = "",
}) {
  const isCompactVariant = variant === "compact";
  const showContactWidget = !isCompactVariant && model.visibility?.chatWidget !== false;
  const viewportWidth = isCompactVariant
    ? COMPACT_PREVIEW_VIEWPORT_WIDTH
    : resolveViewportWidth(viewport, templateId);
  const { scaleShellRef, scaleInnerRef, scaleMetrics } = usePreviewScaleMetrics(viewportWidth);
  const compactScale = COMPACT_PREVIEW_WIDTH / viewportWidth;
  const previewHeight = scaleMetrics.height ? `${scaleMetrics.height}px` : undefined;
  const compactShellStyle = {
    width: `${COMPACT_PREVIEW_WIDTH}px`,
    height: `${COMPACT_PREVIEW_MAX_HEIGHT}px`,
  };
  const scaledShellStyle = previewHeight ? { height: previewHeight } : undefined;
  const scaleShellStyle = isCompactVariant ? compactShellStyle : scaledShellStyle;
  const compactInnerStyle = {
    width: `${viewportWidth}px`,
    transform: `scale(${compactScale})`,
  };
  const scaledInnerStyle = {
    width: `${viewportWidth}px`,
    transform: `scale(${scaleMetrics.scale})`,
  };
  const scaleInnerStyle = isCompactVariant ? compactInnerStyle : scaledInnerStyle;

  useEffect(() => {
    if (isCompactVariant || !activeTargetId || !scaleInnerRef.current) {
      return;
    }

    const previewTargetNode = scaleInnerRef.current.querySelector(
      `[data-preview-target-id="${activeTargetId}"]`
    );
    scrollPreviewTargetIntoViewport(previewTargetNode);
  }, [activeTargetId, isCompactVariant, scaleInnerRef]);

  return (
    <section
      className={`${styles.previewShell} ${isCompactVariant ? styles.previewShellCompact : ""}`.trim()}
    >
      <div
        ref={scaleShellRef}
        className={`${styles.previewScaleShell} ${isCompactVariant ? styles.previewScaleShellCompact : ""}`.trim()}
        style={scaleShellStyle}
      >
        <div
          ref={scaleInnerRef}
          className={styles.previewScaleInner}
          style={scaleInnerStyle}
        >
          <div className={isCompactVariant ? styles.previewBrowserCompact : ""}>
            <WebsiteTemplateSurface
              templateId={templateId}
              model={model}
              showContactWidget={showContactWidget}
              showBrowserChrome={showBrowserChrome}
              browserTitle={model.site.title || "Website preview"}
              onSelectTarget={onSelectTarget}
              activeTargetId={activeTargetId}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

WebsiteTemplatePreview.propTypes = {
  templateId: PropTypes.string.isRequired,
  model: websiteTemplatePreviewModelPropType,
  variant: PropTypes.oneOf(["default", "compact"]),
  viewport: PropTypes.oneOf(["desktop", "tablet", "mobile"]),
  showBrowserChrome: PropTypes.bool,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
