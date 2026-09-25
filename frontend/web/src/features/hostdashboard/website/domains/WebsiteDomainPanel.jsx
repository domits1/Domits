import React, { useId, useState } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import builderStyles from "../WebsiteBuilderPage.module.scss";
import styles from "./WebsiteDomainPanel.module.scss";
import { WEBSITE_DOMAINS_STATUS, useWebsiteDomains } from "./useWebsiteDomains";
import {
  buildDomainTimeline,
  isDomainHalted,
  isDomainRemoving,
  resolveDomainProgressCopy,
  resolveDomainReasonCopy,
} from "./websiteDomainTimeline";

const STATUS_LABELS = Object.freeze({
  PENDING: "Pending",
  VERIFIED: "Verified",
  ACTIVE: "Live",
  FAILED: "Failed",
  DISABLED: "Turned off",
  REMOVING: "Removing",
});
const STEP_CLASS_BY_STATE = Object.freeze({
  done: "stepDone",
  current: "stepCurrent",
  failed: "stepFailed",
  pending: "stepPending",
});

const formatCheckedAt = (checkedAt) =>
  Number.isFinite(checkedAt) && checkedAt > 0 ? new Date(checkedAt).toLocaleString() : "";

const copyText = async (value) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard.");
  } catch {
    toast.error("Copy failed. Select the text and copy it manually.");
  }
};

function DomainRow({ entry }) {
  const isLiveCustomDomain = entry.domainType === "CUSTOM" && entry.status === "ACTIVE";
  return (
    <li className={styles.domainRow}>
      {isLiveCustomDomain ? (
        <a className={styles.domainName} href={`https://${entry.domain}`} target="_blank" rel="noreferrer">
          {entry.domain}
        </a>
      ) : (
        <span className={styles.domainName}>{entry.domain}</span>
      )}
      <span className={styles.domainMeta}>
        {entry.isPrimary ? <span className={styles.primaryPill}>Main address</span> : null}
        <span className={builderStyles.statusPill}>{STATUS_LABELS[entry.status] || entry.status}</span>
      </span>
    </li>
  );
}

DomainRow.propTypes = {
  entry: PropTypes.shape({
    domain: PropTypes.string.isRequired,
    domainType: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    isPrimary: PropTypes.bool,
  }).isRequired,
};

function DomainTimeline({ steps }) {
  return (
    <ol className={styles.timeline}>
      {steps.map((step) => (
        <li key={step.key} className={`${styles.step} ${styles[STEP_CLASS_BY_STATE[step.state]]}`.trim()}>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

DomainTimeline.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired, state: PropTypes.string })
  ).isRequired,
};

function DnsRecordBlock({ record }) {
  return (
    <dl className={styles.dnsRecord}>
      <div className={styles.dnsRow}>
        <dt>Type</dt>
        <dd>{record.type}</dd>
      </div>
      <div className={styles.dnsRow}>
        <dt>Name</dt>
        <dd>{record.name}</dd>
        <button
          type="button"
          className={styles.copyButton}
          aria-label="Copy name"
          onClick={() => copyText(record.name)}>
          Copy
        </button>
      </div>
      <div className={styles.dnsRow}>
        <dt>Value</dt>
        <dd>{record.value}</dd>
        <button
          type="button"
          className={styles.copyButton}
          aria-label="Copy value"
          onClick={() => copyText(record.value)}>
          Copy
        </button>
      </div>
    </dl>
  );
}

DnsRecordBlock.propTypes = {
  record: PropTypes.shape({
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
};

function ConnectDomainForm({ onConnect, isConnecting, fieldError }) {
  const inputId = useId();
  const [value, setValue] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    void onConnect(value);
  };

  return (
    <form className={styles.connectForm} onSubmit={handleSubmit}>
      <label className={builderStyles.fieldLabel} htmlFor={inputId}>
        Your domain
      </label>
      <div className={styles.connectRow}>
        <input
          id={inputId}
          className={styles.domainInput}
          type="text"
          value={value}
          placeholder="www.example.com"
          disabled={isConnecting}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="submit" className={builderStyles.primaryButton} disabled={isConnecting}>
          {isConnecting ? "Connecting…" : "Connect"}
        </button>
      </div>
      {fieldError ? (
        <p className={styles.fieldError} role="alert">
          {fieldError}
        </p>
      ) : null}
    </form>
  );
}

ConnectDomainForm.propTypes = {
  onConnect: PropTypes.func.isRequired,
  isConnecting: PropTypes.bool.isRequired,
  fieldError: PropTypes.string.isRequired,
};

function CustomDomainStatus({ domain, onCheckAgain, onRemove, onPromote, isChecking, isRemoving, isPromoting }) {
  const isHalted = isDomainHalted(domain);
  const isBeingRemoved = isDomainRemoving(domain);
  const isLive = domain.status === "ACTIVE";
  const canPromote = isLive && !domain.isPrimary;
  const showDnsRecord = Boolean(domain.dnsRecord) && !isHalted && !isBeingRemoved;
  const isBusy = isChecking || isRemoving || isPromoting;
  const checkedAt = formatCheckedAt(domain.lastCheckedAt);

  return (
    <div className={styles.customDomain}>
      {isBeingRemoved ? null : <DomainTimeline steps={buildDomainTimeline(domain)} />}
      <p className={isHalted ? styles.reason : styles.progress}>
        {isHalted ? resolveDomainReasonCopy(domain.reason) : resolveDomainProgressCopy(domain)}
      </p>
      {showDnsRecord && isLive ? (
        <details>
          <summary>Show DNS record</summary>
          <DnsRecordBlock record={domain.dnsRecord} />
        </details>
      ) : null}
      {showDnsRecord && !isLive ? <DnsRecordBlock record={domain.dnsRecord} /> : null}
      <div className={builderStyles.buttonRow}>
        <button type="button" className={builderStyles.secondaryButton} onClick={onCheckAgain} disabled={isBusy}>
          {isChecking ? "Checking…" : "Check again"}
        </button>
        {canPromote ? (
          <button
            type="button"
            className={builderStyles.secondaryButton}
            onClick={() => onPromote(domain.domain)}
            disabled={isBusy}>
            {isPromoting ? "Making main address…" : "Make main address"}
          </button>
        ) : null}
        {isBeingRemoved ? null : (
          <button
            type="button"
            className={builderStyles.secondaryButton}
            onClick={() => onRemove(domain.domain)}
            disabled={isBusy}>
            {isRemoving ? "Removing…" : "Remove domain"}
          </button>
        )}
        {checkedAt ? <span className={builderStyles.metaText}>Last checked: {checkedAt}</span> : null}
      </div>
    </div>
  );
}

CustomDomainStatus.propTypes = {
  domain: PropTypes.shape({
    domain: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    isPrimary: PropTypes.bool,
    reason: PropTypes.string,
    dnsRecord: PropTypes.shape({}),
    lastCheckedAt: PropTypes.number,
  }).isRequired,
  onCheckAgain: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onPromote: PropTypes.func.isRequired,
  isChecking: PropTypes.bool.isRequired,
  isRemoving: PropTypes.bool.isRequired,
  isPromoting: PropTypes.bool.isRequired,
};

function DomainPanelBody({ state }) {
  if (state.status === WEBSITE_DOMAINS_STATUS.LOADING || state.status === WEBSITE_DOMAINS_STATUS.IDLE) {
    return <p className={builderStyles.metaText}>Loading domains…</p>;
  }
  if (state.status === WEBSITE_DOMAINS_STATUS.UNPUBLISHED) {
    return (
      <div className={styles.notice}>
        <p>Publish this website first, then connect your domain.</p>
        <button type="button" className={builderStyles.secondaryButton} onClick={() => void state.reload()}>
          Check again
        </button>
      </div>
    );
  }
  if (state.status === WEBSITE_DOMAINS_STATUS.ERROR) {
    return (
      <div className={`${styles.notice} ${styles.noticeError}`}>
        <p>{state.notice?.message}</p>
        <button type="button" className={builderStyles.secondaryButton} onClick={() => void state.reload()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.domainList}>
        {state.domains.map((entry) => (
          <DomainRow key={entry.domain} entry={entry} />
        ))}
      </ul>
      {state.notice ? (
        <p className={`${styles.notice} ${styles.noticeError}`} role="alert">
          {state.notice.message}
          {state.notice.requestId ? <small> Reference: {state.notice.requestId}</small> : null}
        </p>
      ) : null}
      {state.customDomain ? (
        <CustomDomainStatus
          domain={state.customDomain}
          onCheckAgain={state.checkAgain}
          onRemove={state.remove}
          onPromote={state.promote}
          isChecking={state.isChecking}
          isRemoving={state.isRemoving}
          isPromoting={state.isPromoting}
        />
      ) : (
        <ConnectDomainForm onConnect={state.connect} isConnecting={state.isConnecting} fieldError={state.fieldError} />
      )}
    </>
  );
}

DomainPanelBody.propTypes = {
  state: PropTypes.shape({
    status: PropTypes.string.isRequired,
    domains: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
    customDomain: PropTypes.shape({}),
    notice: PropTypes.shape({ message: PropTypes.string, requestId: PropTypes.string }),
    fieldError: PropTypes.string.isRequired,
    isConnecting: PropTypes.bool.isRequired,
    isChecking: PropTypes.bool.isRequired,
    isRemoving: PropTypes.bool.isRequired,
    isPromoting: PropTypes.bool.isRequired,
    connect: PropTypes.func.isRequired,
    checkAgain: PropTypes.func.isRequired,
    remove: PropTypes.func.isRequired,
    promote: PropTypes.func.isRequired,
    reload: PropTypes.func.isRequired,
  }).isRequired,
};

export default function WebsiteDomainPanel({ propertyId }) {
  const [isOpen, setIsOpen] = useState(false);
  const state = useWebsiteDomains({ propertyId, enabled: isOpen });

  return (
    <section className={styles.panel}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((currentValue) => !currentValue)}>
        Custom domain
      </button>
      {isOpen ? (
        <div className={styles.body}>
          <p className={styles.rules}>
            Connect a subdomain such as www.example.com, not example.com. One custom domain per website.
          </p>
          <DomainPanelBody state={state} />
        </div>
      ) : null}
    </section>
  );
}

WebsiteDomainPanel.propTypes = {
  propertyId: PropTypes.string.isRequired,
};
