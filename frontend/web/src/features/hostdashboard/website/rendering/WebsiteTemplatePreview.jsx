import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./WebsiteTemplatePreview.module.scss";
import { getWebsiteTemplateById } from "../websiteTemplates";
import { getWebsiteTemplateRenderer } from "./templateRegistry";
import WebsiteContactWidget from "./WebsiteContactWidget";

const PREVIEW_VIEWPORT_WIDTHS = Object.freeze({
  desktop: 1180,
  tablet: 834,
  mobile: 390,
});

const DEFAULT_SCALE_METRICS = Object.freeze({
  scale: 1,
  height: null,
});
const COMPACT_PREVIEW_WIDTH = 184;
const COMPACT_PREVIEW_MAX_HEIGHT = 228;
const COMPACT_PREVIEW_VIEWPORT_WIDTH = 960;

const resolveViewportWidth = (viewport) => PREVIEW_VIEWPORT_WIDTHS[viewport] || PREVIEW_VIEWPORT_WIDTHS.desktop;

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

export default function WebsiteTemplatePreview({
  templateId,
  model,
  variant = "default",
  viewport = "desktop",
  onSelectTarget,
  activeTargetId = "",
}) {
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(template.id);
  const isCompactVariant = variant === "compact";
  const showContactWidget = !isCompactVariant && model.visibility?.chatWidget !== false;
  const viewportWidth = isCompactVariant
    ? COMPACT_PREVIEW_VIEWPORT_WIDTH
    : resolveViewportWidth(viewport);
  const { scaleShellRef, scaleInnerRef, scaleMetrics } = usePreviewScaleMetrics(viewportWidth);
  const compactScale = COMPACT_PREVIEW_WIDTH / viewportWidth;
  const previewHeight = scaleMetrics.height
    ? `${isCompactVariant ? Math.min(scaleMetrics.height, COMPACT_PREVIEW_MAX_HEIGHT) : scaleMetrics.height}px`
    : undefined;
  const scaleShellStyle = isCompactVariant
    ? {
        width: `${COMPACT_PREVIEW_WIDTH}px`,
        height: `${COMPACT_PREVIEW_MAX_HEIGHT}px`,
      }
    : previewHeight
      ? { height: previewHeight }
      : undefined;
  const scaleInnerStyle = isCompactVariant
    ? {
        width: `${viewportWidth}px`,
        transform: `scale(${compactScale})`,
      }
    : {
        width: `${viewportWidth}px`,
        transform: `scale(${scaleMetrics.scale})`,
      };

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
          <div className={`${styles.previewBrowser} ${isCompactVariant ? styles.previewBrowserCompact : ""}`.trim()}>
            <div className={styles.previewBrowserBar}>
              <div className={styles.previewBrowserDots} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className={styles.previewBrowserTitle}>{model.site.title || "Website preview"}</div>
            </div>

            <div className={styles.previewCanvas}>
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
        </div>
      </div>
    </section>
  );
}

WebsiteTemplatePreview.propTypes = {
  templateId: PropTypes.string.isRequired,
  model: PropTypes.shape({
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
  }).isRequired,
  variant: PropTypes.oneOf(["default", "compact"]),
  viewport: PropTypes.oneOf(["desktop", "tablet", "mobile"]),
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
