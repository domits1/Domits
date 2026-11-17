import React from "react";
import PropTypes from "prop-types";
import DeleteIcon from "@mui/icons-material/Delete";
import { CollapsibleSection, TextField } from "../WebsiteEditorFields";
import { EDITOR_SECTION_KEYS } from "../../websiteEditorConfig";
import { SITE_PROPERTIES_LISTINGS_STATUS } from "../hooks/useWebsiteEditorSiteProperties";
import {
  MAX_SITE_PROPERTIES,
  MAX_SITE_PROPERTY_SLUG_LENGTH,
  cleanSitePropertySlug,
} from "../websiteEditorSiteProperties";
import pageStyles from "../../WebsiteEditorPage.module.scss";
import styles from "./WebsiteEditorPropertiesSection.module.scss";

const ACTION_CLASS_NAME = `${pageStyles.secondaryButton} ${pageStyles.collectionActionButton}`;

function WebsiteEditorPropertyCard({ entry, index, entryCount, onSlugKeyDown, sitePropertiesEditor }) {
  const { isActive, isListed, isMainProperty, propertyId, slug, slugProblem, title } = entry;
  const hasOtherEntries = entryCount > 1;
  const moves = [
    ["up", -1, index < 1],
    ["down", 1, index >= entryCount - 1],
  ];

  return (
    <li className={pageStyles.collectionCard}>
      <div className={styles.propertyHeader}>
        <p className={styles.propertyTitle}>{title}</p>
        {isMainProperty ? <span className={pageStyles.metaPill}>Main property</span> : null}
      </div>
      {isListed ? null : <p className={pageStyles.errorText}>This listing is no longer one of yours. Remove it.</p>}
      {isListed && !isActive ? (
        <p className={pageStyles.helperText}>Not live on Domits. The website cannot be published while it is listed.</p>
      ) : null}
      {isListed && hasOtherEntries ? (
        <>
          <TextField
            field={{ key: `site-property-slug-${index}`, label: `Address of ${title}`, component: "input" }}
            value={slug}
            maxLength={MAX_SITE_PROPERTY_SLUG_LENGTH}
            onChange={(event) => sitePropertiesEditor.setSitePropertySlug(propertyId, event.target.value)}
            onKeyDown={onSlugKeyDown}
          />
          <p className={slugProblem ? pageStyles.errorText : pageStyles.helperText}>
            {slugProblem || `/properties/${cleanSitePropertySlug(slug)}`}
          </p>
        </>
      ) : null}
      {hasOtherEntries ? (
        <div className={pageStyles.collectionActionRow}>
          {moves.map(([direction, offset, isDisabled]) => (
            <button
              key={direction}
              type="button"
              className={`${ACTION_CLASS_NAME} ${pageStyles.collectionActionMoveButton}`}
              aria-label={`Move ${title} ${direction}`}
              disabled={isDisabled}
              onClick={() => sitePropertiesEditor.moveSiteProperty(propertyId, offset)}>
              Move {direction}
            </button>
          ))}
          {isMainProperty ? null : (
            <button
              type="button"
              className={`${ACTION_CLASS_NAME} ${pageStyles.collectionActionDeleteButton}`}
              aria-label={`Remove ${title}`}
              title={`Remove ${title}`}
              onClick={() => sitePropertiesEditor.removeSiteProperty(propertyId)}>
              <DeleteIcon fontSize="small" />
            </button>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function WebsiteEditorPropertiesSection({
  isOpen,
  onSlugKeyDown,
  onToggle,
  sectionRef = null,
  sitePropertiesEditor,
}) {
  const { addableListings, canAddSiteProperty, entries, listingsStatus } = sitePropertiesEditor;

  return (
    <CollapsibleSection
      sectionId={EDITOR_SECTION_KEYS.properties}
      title="Properties"
      description={`Show more of your own listings on this website, each at its own address. Up to ${MAX_SITE_PROPERTIES}.`}
      isOpen={isOpen}
      onToggle={onToggle}
      sectionRef={sectionRef}>
      {listingsStatus === SITE_PROPERTIES_LISTINGS_STATUS.LOADING ? (
        <p className={pageStyles.helperText}>Loading your listings...</p>
      ) : null}
      {listingsStatus === SITE_PROPERTIES_LISTINGS_STATUS.FAILED ? (
        <p className={pageStyles.errorText} role="alert">
          We could not load your listings. The properties on your website stay as they are. Save your changes, then
          reload the page to try again.
        </p>
      ) : null}
      {listingsStatus === SITE_PROPERTIES_LISTINGS_STATUS.READY ? (
        <div className={pageStyles.collectionStack}>
          <p className={pageStyles.helperText}>
            {entries.length > 1
              ? "Each property gets its own page, in this order."
              : "Your website shows one property. Add another listing to give each property its own page."}
          </p>
          <ol className={styles.propertyList}>
            {entries.map((entry, index) => (
              <WebsiteEditorPropertyCard
                key={entry.propertyId}
                entry={entry}
                index={index}
                entryCount={entries.length}
                onSlugKeyDown={onSlugKeyDown}
                sitePropertiesEditor={sitePropertiesEditor}
              />
            ))}
          </ol>
          {addableListings.map((listing) => (
            <div key={listing.propertyId} className={styles.propertyHeader}>
              <p className={styles.propertyTitle}>
                {listing.title}
                {listing.isActive ? null : <span className={pageStyles.helperText}> Not live on Domits</span>}
              </p>
              <button
                type="button"
                className={pageStyles.secondaryButton}
                aria-label={`Add ${listing.title}`}
                disabled={!canAddSiteProperty}
                onClick={() => sitePropertiesEditor.addSiteProperty(listing.propertyId)}>
                Add
              </button>
            </div>
          ))}
          {canAddSiteProperty ? null : (
            <p className={pageStyles.helperText}>A website can show at most {MAX_SITE_PROPERTIES} properties.</p>
          )}
        </div>
      ) : null}
    </CollapsibleSection>
  );
}

export const sitePropertiesEditorPropType = PropTypes.shape({
  canEditSiteProperties: PropTypes.bool.isRequired,
  listingsStatus: PropTypes.oneOf(Object.values(SITE_PROPERTIES_LISTINGS_STATUS)).isRequired,
  entries: PropTypes.arrayOf(PropTypes.object).isRequired,
  addableListings: PropTypes.arrayOf(PropTypes.object).isRequired,
  canAddSiteProperty: PropTypes.bool.isRequired,
  addSiteProperty: PropTypes.func.isRequired,
  moveSiteProperty: PropTypes.func.isRequired,
  removeSiteProperty: PropTypes.func.isRequired,
  setSitePropertySlug: PropTypes.func.isRequired,
});

const sectionPropTypes = {
  onSlugKeyDown: PropTypes.func.isRequired,
  sitePropertiesEditor: sitePropertiesEditorPropType.isRequired,
};

WebsiteEditorPropertyCard.propTypes = {
  ...sectionPropTypes,
  entry: PropTypes.shape({
    propertyId: PropTypes.string.isRequired,
    slug: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    isMainProperty: PropTypes.bool.isRequired,
    isListed: PropTypes.bool.isRequired,
    isActive: PropTypes.bool.isRequired,
    slugProblem: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  entryCount: PropTypes.number.isRequired,
};

WebsiteEditorPropertiesSection.propTypes = {
  ...sectionPropTypes,
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  sectionRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
};
