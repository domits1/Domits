import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import styles from "./WebsiteTemplatePreview.module.scss";
import { getWebsiteTemplateById } from "../websiteTemplates";
import { getWebsiteTemplateRenderer } from "./templateRegistry";

const PREVIEW_VIEWPORT_WIDTHS = Object.freeze({
  desktop: 1180,
  tablet: 834,
  mobile: 390,
});

const DEFAULT_SCALE_METRICS = Object.freeze({
  scale: 1,
  height: null,
});

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

export default function WebsiteTemplatePreview({ templateId, model, variant = "default", viewport = "desktop" }) {
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(template.id);
  const viewportWidth = resolveViewportWidth(viewport);
  const { scaleShellRef, scaleInnerRef, scaleMetrics } = usePreviewScaleMetrics(viewportWidth);
  const isCompactVariant = variant === "compact";

  return (
    <section
      className={`${styles.previewShell} ${isCompactVariant ? styles.previewShellCompact : ""}`.trim()}
    >
      {!isCompactVariant ? (
        <div className={styles.previewHeader}>
          <div className={styles.previewHeaderCopy}>
            <p className={styles.previewEyebrow}>Imported listing preview</p>
            <h3>{model.site.templateReadyTitle}</h3>
            <p>
              Previewing the selected Domits listing inside the {template.name} layout. Saved draft
              overrides are applied on top of the shared website content model before rendering.
            </p>
          </div>

          <div className={styles.previewHeaderMeta}>
            <span className={styles.previewMetaPill}>{template.name}</span>
            <span className={styles.previewMetaPill}>{viewport}</span>
            {model.location.label ? <span className={styles.previewMetaPill}>{model.location.label}</span> : null}
          </div>
        </div>
      ) : null}

      <div
        ref={scaleShellRef}
        className={`${styles.previewScaleShell} ${isCompactVariant ? styles.previewScaleShellCompact : ""}`.trim()}
        style={scaleMetrics.height ? { minHeight: `${scaleMetrics.height}px` } : undefined}
      >
        <div
          ref={scaleInnerRef}
          className={styles.previewScaleInner}
          style={{
            width: `${viewportWidth}px`,
            transform: `scale(${scaleMetrics.scale})`,
          }}
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
                <TemplateComponent model={model} />
              ) : (
                <UnsupportedTemplatePreview templateName={template.name} />
              )}
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
    site: PropTypes.shape({
      title: PropTypes.string,
      templateReadyTitle: PropTypes.string,
    }).isRequired,
    location: PropTypes.shape({
      label: PropTypes.string,
    }).isRequired,
  }).isRequired,
  variant: PropTypes.oneOf(["default", "compact"]),
  viewport: PropTypes.oneOf(["desktop", "tablet", "mobile"]),
};
