import React from "react";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { LOADING_EDITOR_SECTIONS } from "../websiteEditorConfig";
import {
  getPublishLiveSiteActionLabel,
  getWebsiteActionMenuButtonLabel,
  primarySiteDomainPropType,
  refPropType,
  resolvePublicSiteLinkPresentation,
  siteSummaryPropType,
} from "./websiteEditorUtils";
import styles from "../WebsiteEditorPage.module.scss";
import arrowDownIcon from "../../../../images/arrow-down-icon.svg";

export function WebsiteEditorLoadingState({
  renderLoadingSection,
  editorPanelRef,
  onEditorPanelWheel,
}) {
  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.editorPage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Standalone website draft editor</p>
            <div className={styles.heroHeader}>
              <div>
                <h1 className={styles.heroTitle}>Opening website editor</h1>
                <p className={styles.heroDescription}>
                  Imported listing data, saved overrides, and template bindings are loading into the
                  editor surface.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.surface}>
            <aside ref={editorPanelRef} className={styles.editorPanel} onWheel={onEditorPanelWheel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.panelTitle}>Editor</h2>
              </div>

              <div className={styles.editorForm}>{LOADING_EDITOR_SECTIONS.map(renderLoadingSection)}</div>
            </aside>

            <section className={styles.previewPanel}>
              <div className={`${styles.panelHeader} ${styles.previewPanelHeader}`.trim()}>
                <h2 className={styles.panelTitle}>Website preview</h2>
              </div>

              <div className={styles.loadingPreviewCard}>
                <PulseBarsLoader message="Loading website preview..." />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

WebsiteEditorLoadingState.propTypes = {
  renderLoadingSection: PropTypes.func.isRequired,
  editorPanelRef: refPropType,
  onEditorPanelWheel: PropTypes.func,
};

export function WebsiteEditorErrorState({ loadError, navigate }) {
  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.editorPage}>
          <div className={`${styles.stateCard} ${styles.stateCardError}`}>
            <p className={styles.errorText}>{loadError || "We could not open this website draft."}</p>
            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate("/hostdashboard/website")}
              >
                Back to website workspace
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

WebsiteEditorErrorState.propTypes = {
  loadError: PropTypes.string,
  navigate: PropTypes.func.isRequired,
};

export function WebsiteEditorActionMenu({
  actionMenuRef,
  isActionMenuOpen,
  toggleActionMenu,
  hasLiveSite,
  primarySiteDomain,
  openLiveWebsiteLink,
  updateLiveSiteChanges,
  isMutatingDraft,
  hasLiveSyncPending,
  isUpdatingLiveSite,
  publishLiveSite,
  canPublishSite,
  isPublishingSite,
  unpublishLiveSite,
  canUnpublishSite,
  isUnpublishingSite,
  discardDraftChanges,
  isDiscardingChanges,
}) {
  const actionMenuButtonLabel = getWebsiteActionMenuButtonLabel({
    hasLiveSite,
    isPublishingSite,
    isUpdatingLiveSite,
  });

  return (
    <div ref={actionMenuRef} className={styles.actionMenuContainer}>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={toggleActionMenu}
        aria-haspopup="menu"
        aria-expanded={isActionMenuOpen}
      >
        <span>{actionMenuButtonLabel}</span>{" "}
        <img
          src={arrowDownIcon}
          alt=""
          aria-hidden="true"
          className={`${styles.actionMenuButtonIcon} ${
            isActionMenuOpen ? styles.actionMenuButtonIconOpen : ""
          }`.trim()}
        />
      </button>
      <div
        className={`${styles.actionMenuList} ${isActionMenuOpen ? styles.actionMenuListOpen : ""}`.trim()}
        role="menu"
        aria-label="Website update actions"
        aria-hidden={!isActionMenuOpen}
      >
        {hasLiveSite && primarySiteDomain?.domain ? (
          <button
            type="button"
            role="menuitem"
            className={styles.actionMenuItem}
            onClick={openLiveWebsiteLink}
          >
            Open live site
          </button>
        ) : null}
        {hasLiveSite ? (
          <>
            <button
              type="button"
              role="menuitem"
              className={styles.actionMenuItem}
              onClick={updateLiveSiteChanges}
              disabled={isMutatingDraft || !hasLiveSyncPending}
            >
              {isUpdatingLiveSite ? "Updating..." : "Update live site"}
            </button>
            <button
              type="button"
              role="menuitem"
              className={styles.actionMenuItem}
              onClick={unpublishLiveSite}
              disabled={!canUnpublishSite}
            >
              {isUnpublishingSite ? "Unpublishing..." : "Unpublish site"}
            </button>
          </>
        ) : (
          <button
            type="button"
            role="menuitem"
            className={styles.actionMenuItem}
            onClick={publishLiveSite}
            disabled={!canPublishSite}
          >
            <PublicOutlinedIcon fontSize="small" />
            {getPublishLiveSiteActionLabel(isPublishingSite)}
          </button>
        )}
        <button
          type="button"
          role="menuitem"
          className={`${styles.actionMenuItem} ${styles.actionMenuItemDestructive}`.trim()}
          onClick={discardDraftChanges}
          disabled={isMutatingDraft || !hasLiveSyncPending}
        >
          {isDiscardingChanges ? "Discarding..." : "Discard all changes"}
        </button>
      </div>
    </div>
  );
}

WebsiteEditorActionMenu.propTypes = {
  actionMenuRef: refPropType,
  isActionMenuOpen: PropTypes.bool.isRequired,
  toggleActionMenu: PropTypes.func.isRequired,
  hasLiveSite: PropTypes.bool.isRequired,
  primarySiteDomain: primarySiteDomainPropType,
  openLiveWebsiteLink: PropTypes.func.isRequired,
  updateLiveSiteChanges: PropTypes.func.isRequired,
  isMutatingDraft: PropTypes.bool.isRequired,
  hasLiveSyncPending: PropTypes.bool.isRequired,
  isUpdatingLiveSite: PropTypes.bool.isRequired,
  publishLiveSite: PropTypes.func.isRequired,
  canPublishSite: PropTypes.bool.isRequired,
  isPublishingSite: PropTypes.bool.isRequired,
  unpublishLiveSite: PropTypes.func.isRequired,
  canUnpublishSite: PropTypes.bool.isRequired,
  isUnpublishingSite: PropTypes.bool.isRequired,
  discardDraftChanges: PropTypes.func.isRequired,
  isDiscardingChanges: PropTypes.bool.isRequired,
};

export function WebsiteEditorPublicSitePanel({
  siteSummary,
  primarySiteDomain,
  liveSiteStatus,
  liveLinkStatus,
  siteSummaryError,
  hasLiveSite,
  hasLiveSyncPending,
  draftId,
}) {
  const { primaryLinkLabel, primaryLinkValue, secondaryLinkHref } = resolvePublicSiteLinkPresentation({
    hasLiveSite,
    primarySiteDomain,
    siteSummary,
    draftId,
  });

  return (
    <section className={styles.publicSitePanel}>
      <div className={styles.publicSiteHeader}>
        <div>
          <h2 className={styles.publicSiteTitle}>Live site</h2>
          <p className={styles.publicSiteDescription}>
            Publish creates the Domits live link. Update applies the latest editor changes to the
            public website.
          </p>
        </div>
        {siteSummary?.isReachable ? <span className={styles.publicSiteReachableBadge}>Reachable</span> : null}
      </div>

      <div className={styles.publicSiteGrid}>
        <div className={styles.publicSiteMetric}>
          <span className={styles.publicSiteLabel}>{primaryLinkLabel}</span>
          {secondaryLinkHref ? (
            <a
              className={`${styles.publicSiteLink} ${styles.publicSiteValueLink}`.trim()}
              href={secondaryLinkHref}
              target="_blank"
              rel="noreferrer"
            >
              <strong className={styles.publicSiteValue}>{primaryLinkValue}</strong>
            </a>
          ) : (
            <strong className={styles.publicSiteValue}>{primaryLinkValue}</strong>
          )}
        </div>
        <div className={styles.publicSiteMetric}>
          <span className={styles.publicSiteLabel}>Link status</span>
          <strong className={styles.publicSiteValue}>{liveLinkStatus}</strong>
        </div>
        <div className={styles.publicSiteMetric}>
          <span className={styles.publicSiteLabel}>Publication status</span>
          <strong className={styles.publicSiteValue}>{liveSiteStatus}</strong>
        </div>
      </div>

      {siteSummaryError ? <p className={styles.publicSiteError}>{siteSummaryError}</p> : null}
      {!siteSummaryError && hasLiveSite && hasLiveSyncPending ? (
        <p className={styles.publicSiteHint}>
          Update the live site to push the latest editor changes to the public website.
        </p>
      ) : null}
      {!siteSummaryError && !hasLiveSite ? (
        <p className={styles.publicSiteHint}>
          Publish the website once to generate its Domits live link.
        </p>
      ) : null}
    </section>
  );
}

WebsiteEditorPublicSitePanel.propTypes = {
  siteSummary: siteSummaryPropType,
  primarySiteDomain: primarySiteDomainPropType,
  liveSiteStatus: PropTypes.string.isRequired,
  liveLinkStatus: PropTypes.string.isRequired,
  siteSummaryError: PropTypes.string,
  hasLiveSite: PropTypes.bool.isRequired,
  hasLiveSyncPending: PropTypes.bool.isRequired,
  draftId: PropTypes.string,
};
