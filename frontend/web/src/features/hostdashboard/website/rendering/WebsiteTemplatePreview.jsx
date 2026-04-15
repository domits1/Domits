import React from "react";
import PropTypes from "prop-types";
import styles from "./WebsiteTemplatePreview.module.scss";
import { getWebsiteTemplateById } from "../websiteTemplates";
import { getWebsiteTemplateRenderer } from "./templateRegistry";

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

export default function WebsiteTemplatePreview({ templateId, model }) {
  const template = getWebsiteTemplateById(templateId);
  const TemplateComponent = getWebsiteTemplateRenderer(template.id);

  return (
    <section className={styles.previewShell}>
      <div className={styles.previewHeader}>
        <div className={styles.previewHeaderCopy}>
          <p className={styles.previewEyebrow}>Imported listing preview</p>
          <h3>{model.site.templateReadyTitle}</h3>
          <p>
            Previewing the selected Domits listing inside the {template.name} layout. The data mapping is
            real; this stage is not persisted yet, and publish controls plus editable section overrides
            come next.
          </p>
        </div>

        <div className={styles.previewHeaderMeta}>
          <span className={styles.previewMetaPill}>{template.name}</span>
          {model.location.label ? <span className={styles.previewMetaPill}>{model.location.label}</span> : null}
        </div>
      </div>

      <div className={styles.previewBrowser}>
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
};
