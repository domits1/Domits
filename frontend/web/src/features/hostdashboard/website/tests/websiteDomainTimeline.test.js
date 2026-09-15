import {
  DOMAIN_STEP_STATE,
  buildDomainTimeline,
  resolveDomainErrorCopy,
  resolveDomainProgressCopy,
  resolveDomainReasonCopy,
  validateCustomDomainInput,
} from "../domains/websiteDomainTimeline";

const domain = (overrides = {}) => ({
  domain: "www.example.com",
  domainType: "CUSTOM",
  status: "PENDING",
  isPrimary: false,
  dnsRecord: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
  dnsVerified: null,
  certificateStatus: "pending-validation",
  reason: "certificate_pending",
  lastError: null,
  lastCheckedAt: 1,
  ...overrides,
});

const stepStates = (record) => buildDomainTimeline(record).map((step) => step.state);
const { DONE, CURRENT, FAILED, PENDING } = DOMAIN_STEP_STATE;

describe("buildDomainTimeline", () => {
  it.each([
    ["pending without DNS", domain(), [DONE, CURRENT, PENDING, PENDING]],
    ["pending with DNS found", domain({ dnsVerified: true }), [DONE, DONE, CURRENT, PENDING]],
    [
      "verified",
      domain({ status: "VERIFIED", dnsVerified: true, certificateStatus: "issued" }),
      [DONE, DONE, DONE, CURRENT],
    ],
    ["active", domain({ status: "ACTIVE", dnsVerified: true, certificateStatus: "issued" }), [DONE, DONE, DONE, DONE]],
    [
      "in use elsewhere",
      domain({ status: "FAILED", reason: "domain_in_use_elsewhere" }),
      [FAILED, PENDING, PENDING, PENDING],
    ],
    [
      "DNS never appeared",
      domain({ status: "FAILED", reason: "certificate_validation-timed-out" }),
      [DONE, FAILED, PENDING, PENDING],
    ],
    [
      "certificate failed",
      domain({ status: "FAILED", dnsVerified: true, reason: "certificate_failed" }),
      [DONE, DONE, FAILED, PENDING],
    ],
    [
      "disabled",
      domain({ status: "DISABLED", dnsVerified: true, reason: "tenant_disabled" }),
      [DONE, DONE, FAILED, PENDING],
    ],
  ])("places the steps for a domain that is %s", (_label, record, expected) => {
    expect(stepStates(record)).toEqual(expected);
  });

  it("names the four steps in order and returns nothing without a domain", () => {
    expect(buildDomainTimeline(domain()).map((step) => step.label)).toEqual([
      "Domain added",
      "DNS record found",
      "Certificate issued",
      "Domain live",
    ]);
    expect(buildDomainTimeline(null)).toEqual([]);
  });
});

describe("resolveDomainProgressCopy / resolveDomainReasonCopy", () => {
  it("tells the host what happens next at each stage", () => {
    expect(resolveDomainProgressCopy(domain())).toMatch(/create the cname record/i);
    expect(resolveDomainProgressCopy(domain())).toMatch(/open this panel or press check again/i);
    expect(resolveDomainProgressCopy(domain())).not.toMatch(/automatically|within an hour/i);
    expect(resolveDomainProgressCopy(domain({ dnsVerified: true }))).toMatch(/waiting for the certificate/i);
    expect(resolveDomainProgressCopy(domain({ status: "VERIFIED" }))).toMatch(/going live/i);
    expect(resolveDomainProgressCopy(domain({ status: "ACTIVE" }))).toMatch(/live/i);
  });

  it("tells the host to add the CNAME and press check again while the domain waits for its record", () => {
    const waiting = domain({ reason: "dns_required", certificateStatus: null });

    expect(resolveDomainProgressCopy(waiting)).toMatch(
      /create the cname record below at your dns provider, then press check again/i
    );
    expect(buildDomainTimeline(waiting).map((step) => step.state)).toEqual(["done", "current", "pending", "pending"]);
  });

  it("explains a failure from its reason and always points at check again", () => {
    expect(resolveDomainReasonCopy("domain_in_use_elsewhere")).toMatch(
      /already connected to another website or service/i
    );
    expect(resolveDomainReasonCopy("certificate_validation-timed-out")).toMatch(/never appeared/i);
    expect(resolveDomainReasonCopy("certificate_validation-timed-out")).not.toMatch(/check again/i);
    expect(resolveDomainReasonCopy("certificate_validation-timed-out")).toMatch(/contact support to start again/i);
    expect(resolveDomainReasonCopy("certificate_expired")).toMatch(/certificate could not be issued/i);
    expect(resolveDomainReasonCopy("tenant_not_found")).toMatch(/removed on our side/i);
    expect(resolveDomainReasonCopy("something_new")).toMatch(/could not be activated/i);
    expect(resolveDomainReasonCopy("tenant_not_found")).toMatch(/contact support/i);
  });
});

describe("resolveDomainErrorCopy", () => {
  it.each([
    ["invalid_domain", "field", /subdomain like www\.example\.com/i],
    ["domain_taken", "field", /another domits website/i],
    ["domain_limit_reached", "field", /already has a custom domain/i],
    ["site_not_found", "panel", /refresh the page/i],
    ["domain_not_found", "panel", /no custom domain to check/i],
    ["unauthorized", "panel", /sign in again/i],
    ["forbidden", "panel", /sign in again/i],
    ["sync_failed", "panel", /couldn't reach the domain service/i],
    ["tenant_create_failed", "panel", /couldn't reach the domain service/i],
    ["network_error", "panel", /couldn't reach the domain service/i],
    ["internal_error", "panel", /our side/i],
    ["never_seen", "panel", /our side/i],
  ])("maps %s to the %s with the right copy", (code, scope, pattern) => {
    const presentation = resolveDomainErrorCopy({ code, message: "server text" });
    expect(presentation.scope).toBe(scope);
    expect(presentation.message).toMatch(pattern);
  });

  it("falls back to a panel notice for errors without a code", () => {
    expect(resolveDomainErrorCopy(new Error("boom"))).toMatchObject({ scope: "panel" });
  });
});

describe("validateCustomDomainInput", () => {
  it("normalises a valid subdomain", () => {
    expect(validateCustomDomainInput(" WWW.Example.com. ")).toEqual({ domain: "www.example.com", error: "" });
  });

  it.each([
    ["", /enter the domain/i],
    ["example.com", /subdomain like www\.example\.com/i],
    ["*.example.com", /wildcards/i],
    ["bad_label.example.com", /subdomain like www\.example\.com/i],
    ["villa.direct.domits.com", /domits address already/i],
  ])("rejects %j", (value, pattern) => {
    expect(validateCustomDomainInput(value).error).toMatch(pattern);
  });
});
