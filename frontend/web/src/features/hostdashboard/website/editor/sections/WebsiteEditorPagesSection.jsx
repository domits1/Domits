import React from "react";
import PropTypes from "prop-types";
import { CollapsibleSection, TextField } from "../WebsiteEditorFields";
import { WebsiteEditorVisibilityToggleCard } from "../WebsiteEditorVisibilityToggleCard";
import { EDITOR_SECTION_KEYS } from "../../websiteEditorConfig";
import {
  MAIN_SITE_PAGE_KEY,
  MAX_SITE_PAGE_NAV_LABEL_LENGTH,
  SITE_PAGE_DEFINITIONS,
  normalizeSitePageNavLabel,
} from "../../rendering/websitePages";
import styles from "../../WebsiteEditorPage.module.scss";

const CONFIGURABLE_SITE_PAGES = SITE_PAGE_DEFINITIONS.filter((page) => page.key !== MAIN_SITE_PAGE_KEY);

function WebsiteEditorSitePageCard({ page, value, onChangeEnabled, onChangeNavLabel, onNavLabelKeyDown }) {
  const idPrefix = `website-editor-site-page-${page.key}`;
  const hasUnusableNavLabel = normalizeSitePageNavLabel(value.navLabel) === "";

  return (
    <div className={styles.fieldStack}>
      <WebsiteEditorVisibilityToggleCard
        checked={value.enabled}
        descriptionId={`${idPrefix}-description`}
        field={{ key: page.key, label: `${page.defaultNavLabel} page`, description: `Its own page at /${page.slug}.` }}
        inputId={idPrefix}
        labelId={`${idPrefix}-label`}
        onChange={(event) => onChangeEnabled(page.key, event.target.checked)}
      />
      {value.enabled ? (
        <>
          <TextField
            field={{ key: `site-page-${page.key}-nav-label`, label: `${page.defaultNavLabel} menu label`, component: "input" }}
            value={value.navLabel}
            maxLength={MAX_SITE_PAGE_NAV_LABEL_LENGTH}
            onChange={(event) => onChangeNavLabel(page.key, event.target.value)}
            onKeyDown={onNavLabelKeyDown}
          />
          {hasUnusableNavLabel ? (
            <p className={styles.helperText}>
              This label cannot be used, so the menu shows &ldquo;{page.defaultNavLabel}&rdquo;.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

const sitePageValuePropType = PropTypes.shape({
  enabled: PropTypes.bool.isRequired,
  navLabel: PropTypes.string.isRequired,
});

WebsiteEditorSitePageCard.propTypes = {
  page: PropTypes.shape({
    key: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    defaultNavLabel: PropTypes.string.isRequired,
  }).isRequired,
  value: sitePageValuePropType.isRequired,
  onChangeEnabled: PropTypes.func.isRequired,
  onChangeNavLabel: PropTypes.func.isRequired,
  onNavLabelKeyDown: PropTypes.func.isRequired,
};

export function WebsiteEditorPagesSection({
  isOpen,
  onChangeEnabled,
  onChangeNavLabel,
  onNavLabelKeyDown,
  onToggle,
  sectionRef = null,
  sitePages,
}) {
  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.pages}
      title="Pages"
      description="Give sections their own page with a link in the site menu. Availability and booking stay on the home page."
      isOpen={isOpen}
      onToggle={onToggle}
      sectionRef={sectionRef}>
      <div className={styles.toggleStack}>
        {CONFIGURABLE_SITE_PAGES.map((page) => (
          <WebsiteEditorSitePageCard
            key={page.key}
            page={page}
            value={sitePages[page.key]}
            onChangeEnabled={onChangeEnabled}
            onChangeNavLabel={onChangeNavLabel}
            onNavLabelKeyDown={onNavLabelKeyDown}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

WebsiteEditorPagesSection.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onChangeEnabled: PropTypes.func.isRequired,
  onChangeNavLabel: PropTypes.func.isRequired,
  onNavLabelKeyDown: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  sectionRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
  sitePages: PropTypes.objectOf(sitePageValuePropType).isRequired,
};
