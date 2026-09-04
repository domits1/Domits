import PropTypes from "prop-types";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import {
  WEBSITE_CUSTOM_DOMAIN_DEFAULT_NEXT_ACTION,
  WEBSITE_CUSTOM_DOMAIN_DEFAULT_RECOMMENDATION,
  WEBSITE_CUSTOM_DOMAIN_SETUP_STEPS,
} from "./websiteCustomDomainSetupContent";
import styles from "../WebsiteEditorPage.module.scss";

function WebsiteCustomDomainDialog({
  isOpen,
  onClose,
  onSubmit,
  onRecheck,
  onActivate,
  onDeactivate,
  domainValue,
  onDomainChange,
  isSaving,
  isRechecking,
  isActivating,
  isDeactivating,
  canSaveRequest,
  canRecheck,
  canActivate,
  canDeactivate,
  customDomain = null,
  fallbackDomain = "",
  customDomainStatusLabel = "Not requested",
}) {
  if (!isOpen) {
    return null;
  }

  const hasExistingCustomDomain = Boolean(String(customDomain?.domain || "").trim());
  const recommendedUsage =
    String(customDomain?.verificationDetails?.recommendedUsage || "").trim() ||
    WEBSITE_CUSTOM_DOMAIN_DEFAULT_RECOMMENDATION;
  const nextAction =
    String(customDomain?.verificationDetails?.nextAction || "").trim() ||
    WEBSITE_CUSTOM_DOMAIN_DEFAULT_NEXT_ACTION;

  return (
    <dialog
      open
      className={styles.customDomainOverlay}
      aria-labelledby="website-custom-domain-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className={styles.customDomainDialog}>
        <div className={styles.customDomainHeader}>
          <div className={styles.customDomainHeaderCopy}>
            <p className={styles.eyebrow}>Custom domain setup</p>
            <h2 id="website-custom-domain-title" className={styles.panelTitle}>
              {hasExistingCustomDomain ? "Review your custom domain request" : "Request a custom domain"}
            </h2>
            <p className={styles.panelDescription}>
              Save the hostname you want to connect to this direct booking website. The Domits live
              link stays active while the custom domain remains pending.
            </p>
          </div>

          <button
            type="button"
            className={styles.imagePickerCloseButton}
            onClick={onClose}
            aria-label="Close custom domain setup"
          >
            <CloseOutlinedIcon fontSize="small" />
          </button>
        </div>

        <div className={styles.customDomainSummaryGrid}>
          <article className={styles.customDomainMetricCard}>
            <span className={styles.publicSiteLabel}>Current custom domain</span>
            <strong className={styles.publicSiteValue}>
              {hasExistingCustomDomain ? customDomain.domain : "Not requested yet"}
            </strong>
          </article>
          <article className={styles.customDomainMetricCard}>
            <span className={styles.publicSiteLabel}>Request status</span>
            <strong className={styles.publicSiteValue}>{customDomainStatusLabel}</strong>
          </article>
          <article className={styles.customDomainMetricCard}>
            <span className={styles.publicSiteLabel}>Fallback live link</span>
            <strong className={styles.publicSiteValue}>{fallbackDomain || "Publish first"}</strong>
          </article>
        </div>

        <div className={styles.customDomainInstructionBlock}>
          <h3 className={styles.sectionBlockTitle}>How setup works</h3>
          <ol className={styles.customDomainStepList}>
            {WEBSITE_CUSTOM_DOMAIN_SETUP_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className={styles.helperText}>{recommendedUsage}</p>
          <p className={styles.helperText}>{nextAction}</p>
        </div>

        <form className={styles.customDomainForm} onSubmit={onSubmit}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="website-custom-domain-input">
              Custom domain
            </label>
            <input
              id="website-custom-domain-input"
              className={styles.textInput}
              value={domainValue}
              onChange={(event) => onDomainChange(event.target.value)}
              placeholder="stay.example.com"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className={styles.helperText}>
              Root domains such as <strong>example.com</strong> are not supported in this first setup
              flow. Use a subdomain instead.
            </p>
          </div>

          {hasExistingCustomDomain ? (
            <div className={styles.customDomainActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onRecheck}
                disabled={!canRecheck}
              >
                {isRechecking ? "Rechecking..." : "Recheck setup"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onActivate}
                disabled={!canActivate}
              >
                {isActivating ? "Activating..." : "Activate custom domain"}
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={onDeactivate}
                disabled={!canDeactivate}
              >
                {isDeactivating ? "Deactivating..." : "Deactivate custom domain"}
              </button>
            </div>
          ) : null}

          <div className={styles.customDomainActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryButton} disabled={!canSaveRequest}>
              {isSaving
                ? "Saving request..."
                : hasExistingCustomDomain
                  ? "Update custom domain request"
                  : "Save custom domain request"}
            </button>
          </div>
        </form>
      </section>
    </dialog>
  );
}

WebsiteCustomDomainDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onRecheck: PropTypes.func.isRequired,
  onActivate: PropTypes.func.isRequired,
  onDeactivate: PropTypes.func.isRequired,
  domainValue: PropTypes.string.isRequired,
  onDomainChange: PropTypes.func.isRequired,
  isSaving: PropTypes.bool.isRequired,
  isRechecking: PropTypes.bool.isRequired,
  isActivating: PropTypes.bool.isRequired,
  isDeactivating: PropTypes.bool.isRequired,
  canSaveRequest: PropTypes.bool.isRequired,
  canRecheck: PropTypes.bool.isRequired,
  canActivate: PropTypes.bool.isRequired,
  canDeactivate: PropTypes.bool.isRequired,
  customDomain: PropTypes.shape({
    domain: PropTypes.string,
    status: PropTypes.string,
    verificationDetails: PropTypes.object,
  }),
  fallbackDomain: PropTypes.string,
  customDomainStatusLabel: PropTypes.string,
};

export default WebsiteCustomDomainDialog;
