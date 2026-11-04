import { describe, it, expect } from "@jest/globals";
import fc from "fast-check";
import { planSiteRedirects } from "../../functions/PropertyHandler/business/service/staticPageRedirectPlan.js";

const PUBLISHED = { id: "site-1", status: "PUBLISHED" };
const ALIAS = { domain: "home-6156b005.direct.domits.com", domainType: "FALLBACK", status: "ACTIVE", isPrimary: false };
const PRIMARY = { domain: "www.villasensual.nl", domainType: "CUSTOM", status: "ACTIVE", isPrimary: true };

describe("which hostnames of a site redirect to its primary domain", () => {
  it("points every other active domain at an active primary custom domain, and never the primary itself", () => {
    const second = { ...ALIAS, domain: "villasensual-old.direct.domits.com" };

    expect(planSiteRedirects({ site: PUBLISHED, domains: [ALIAS, PRIMARY, second] })).toEqual({
      puts: [
        { hostname: ALIAS.domain, primary: PRIMARY.domain },
        { hostname: second.domain, primary: PRIMARY.domain },
      ],
      deletes: [PRIMARY.domain],
    });
  });

  it("keeps every hostname of a site without a custom domain out of the store", () => {
    expect(planSiteRedirects({ site: PUBLISHED, domains: [ALIAS] })).toEqual({ puts: [], deletes: [ALIAS.domain] });
  });

  it.each(["PENDING", "VERIFIED", "FAILED", "DISABLED"])("redirects nothing while the primary is %s", (status) => {
    expect(planSiteRedirects({ site: PUBLISHED, domains: [ALIAS, { ...PRIMARY, status }] })).toEqual({
      puts: [],
      deletes: [ALIAS.domain, PRIMARY.domain],
    });
  });

  it("redirects nothing to an active custom domain that is not the primary", () => {
    expect(planSiteRedirects({ site: PUBLISHED, domains: [ALIAS, { ...PRIMARY, isPrimary: false }] }).puts).toEqual([]);
  });

  it.each(["DRAFT", "UNPUBLISHED", ""])("redirects nothing for a site that is %s", (status) => {
    expect(planSiteRedirects({ site: { ...PUBLISHED, status }, domains: [ALIAS, PRIMARY] })).toEqual({
      puts: [],
      deletes: [ALIAS.domain, PRIMARY.domain],
    });
  });

  it("removes an alias that is no longer active instead of pointing it at the primary", () => {
    expect(planSiteRedirects({ site: PUBLISHED, domains: [{ ...ALIAS, status: "FAILED" }, PRIMARY] })).toEqual({
      puts: [],
      deletes: [ALIAS.domain, PRIMARY.domain],
    });
  });

  it("leaves out a hostname the store could never hold as a key", () => {
    const plan = planSiteRedirects({ site: PUBLISHED, domains: [{ ...ALIAS, domain: "Bad Host" }, PRIMARY] });

    expect(plan).toEqual({ puts: [], deletes: [PRIMARY.domain] });
  });

  it("never plans a hostname twice, never both ways, and never a key that points at itself or at another key", () => {
    const domain = fc.record({
      domain: fc.constantFrom(ALIAS.domain, PRIMARY.domain, "second.direct.domits.com", "villasensual.com", "Bad Host"),
      domainType: fc.constantFrom("FALLBACK", "CUSTOM"),
      status: fc.constantFrom("ACTIVE", "PENDING", "DISABLED", "FAILED"),
      isPrimary: fc.boolean(),
    });
    fc.assert(
      fc.property(fc.constantFrom("PUBLISHED", "DRAFT"), fc.array(domain, { maxLength: 6 }), (status, domains) => {
        const { puts, deletes } = planSiteRedirects({ site: { ...PUBLISHED, status }, domains });
        const putHostnames = puts.map((put) => put.hostname);
        expect(new Set(putHostnames).size).toBe(putHostnames.length);
        expect(new Set(deletes).size).toBe(deletes.length);
        expect(putHostnames.filter((hostname) => deletes.includes(hostname))).toEqual([]);
        for (const put of puts) {
          expect(put.primary).not.toBe(put.hostname);
          expect(putHostnames).not.toContain(put.primary);
        }
        expect(new Set(puts.map((put) => put.primary)).size).toBeLessThanOrEqual(1);
      })
    );
  });
});
