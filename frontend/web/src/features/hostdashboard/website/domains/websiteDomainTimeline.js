const DEFAULT_FALLBACK_DOMAIN_SUFFIX = "direct.domits.com";
const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const MINIMUM_LABEL_COUNT = 3;
const HALTED_STATUSES = new Set(["FAILED", "DISABLED"]);
const COMPLETED_STEPS_BY_STATUS = Object.freeze({ ACTIVE: 4, VERIFIED: 3 });
const REASON_DOMAIN_IN_USE = "domain_in_use_elsewhere";
const REASON_DNS_TIMED_OUT = "certificate_validation-timed-out";
const CERTIFICATE_REASON_PREFIX = "certificate_";
const CHECK_AGAIN_HINT = " Check again keeps looking. If it stays like this, contact support.";

export const DOMAIN_STEP_STATE = Object.freeze({
  DONE: "done",
  CURRENT: "current",
  FAILED: "failed",
  PENDING: "pending",
});

const STEPS = Object.freeze([
  { key: "added", label: "Domain added" },
  { key: "dns", label: "DNS record found" },
  { key: "certificate", label: "Certificate issued" },
  { key: "live", label: "Domain live" },
]);

const PROGRESS_COPY_BY_COMPLETED_STEPS = Object.freeze({
  1: "Create the CNAME record below at your DNS provider. We check it automatically, usually within an hour, sometimes longer.",
  2: "DNS record found. Waiting for the certificate.",
  3: "Certificate issued. Going live, usually within a few minutes.",
  4: "Your domain is live.",
});

const REASON_COPY = Object.freeze({
  [REASON_DOMAIN_IN_USE]: "This domain is already connected to another website or service. Disconnect it there first.",
  [REASON_DNS_TIMED_OUT]: "We waited for your DNS record but it never appeared.",
  tenant_not_found: "The domain setup was removed on our side.",
  tenant_disabled: "The domain was turned off on our side.",
});

const FIELD_ERROR_COPY = Object.freeze({
  invalid_domain: "Use a subdomain like www.example.com.",
  domain_taken: "This domain is already connected to another Domits website.",
  domain_limit_reached: "This website already has a custom domain.",
});

const PANEL_ERROR_COPY = Object.freeze({
  site_not_found: "We couldn't find this website. Refresh the page.",
  domain_not_found: "There is no custom domain to check yet.",
  unauthorized: "Your session has expired. Sign in again.",
  forbidden: "Your session has expired. Sign in again.",
  sync_failed: "We couldn't reach the domain service. Try again in a moment.",
  tenant_create_failed: "We couldn't reach the domain service. Try again in a moment.",
  network_error: "We couldn't reach the domain service. Try again in a moment.",
});
const DEFAULT_PANEL_ERROR_COPY = "Something went wrong on our side. Try again.";

const countCompletedSteps = (domain) => {
  if (domain.reason === REASON_DOMAIN_IN_USE) {
    return 0;
  }
  if (COMPLETED_STEPS_BY_STATUS[domain.status] !== undefined) {
    return COMPLETED_STEPS_BY_STATUS[domain.status];
  }
  return domain.dnsVerified === true ? 2 : 1;
};

const resolveStepState = (index, completedSteps, haltedState) => {
  if (index < completedSteps) {
    return DOMAIN_STEP_STATE.DONE;
  }
  if (index === completedSteps) {
    return haltedState;
  }
  return DOMAIN_STEP_STATE.PENDING;
};

export const isDomainHalted = (domain) => HALTED_STATUSES.has(domain?.status);

export const buildDomainTimeline = (domain) => {
  if (!domain) {
    return [];
  }

  const completedSteps = countCompletedSteps(domain);
  const haltedState = isDomainHalted(domain) ? DOMAIN_STEP_STATE.FAILED : DOMAIN_STEP_STATE.CURRENT;
  return STEPS.map((step, index) => ({ ...step, state: resolveStepState(index, completedSteps, haltedState) }));
};

export const resolveDomainProgressCopy = (domain) => {
  if (!domain || isDomainHalted(domain)) {
    return "";
  }
  return PROGRESS_COPY_BY_COMPLETED_STEPS[countCompletedSteps(domain)] || "";
};

export const resolveDomainReasonCopy = (reason) => {
  const normalizedReason = String(reason || "");
  const isCertificateFailure =
    normalizedReason.startsWith(CERTIFICATE_REASON_PREFIX) && normalizedReason !== REASON_DNS_TIMED_OUT;
  const copy = isCertificateFailure
    ? "The certificate could not be issued."
    : REASON_COPY[normalizedReason] || "The domain could not be activated.";
  return `${copy}${CHECK_AGAIN_HINT}`;
};

export const resolveDomainErrorCopy = (error) => {
  const code = String(error?.code || "");
  const requestId = String(error?.requestId || "");
  if (FIELD_ERROR_COPY[code]) {
    return { scope: "field", message: FIELD_ERROR_COPY[code], requestId };
  }
  return { scope: "panel", message: PANEL_ERROR_COPY[code] || DEFAULT_PANEL_ERROR_COPY, requestId };
};

const getFallbackDomainSuffix = () =>
  String(process.env.REACT_APP_DIRECT_BOOKING_WEBSITE_FALLBACK_DOMAIN_SUFFIX || DEFAULT_FALLBACK_DOMAIN_SUFFIX)
    .trim()
    .toLowerCase();

export const validateCustomDomainInput = (value) => {
  const domain = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!domain) {
    return { domain, error: "Enter the domain you want to connect." };
  }
  if (domain.includes("*")) {
    return { domain, error: "Wildcards aren't supported." };
  }

  const fallbackSuffix = getFallbackDomainSuffix();
  if (domain === fallbackSuffix || domain.endsWith(`.${fallbackSuffix}`)) {
    return { domain, error: "That's your Domits address already." };
  }

  const labels = domain.split(".");
  const isSubdomain =
    labels.length >= MINIMUM_LABEL_COUNT && labels.every((label) => HOSTNAME_LABEL_PATTERN.test(label));
  return { domain, error: isSubdomain ? "" : FIELD_ERROR_COPY.invalid_domain };
};
