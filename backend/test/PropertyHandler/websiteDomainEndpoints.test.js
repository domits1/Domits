import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";
import {
  WEBSITE_CUSTOM_DOMAIN_ERROR_CODES,
  WebsiteCustomDomainError,
} from "../../functions/PropertyHandler/util/exception/WebsiteCustomDomainError.js";
import { Unauthorized } from "../../functions/PropertyHandler/util/exception/Unauthorized.js";

const HOST_ID = "host-1";
const SITE = { id: "site-1", propertyId: "property-1", hostId: HOST_ID, status: "PUBLISHED" };
const FALLBACK_DOMAIN = {
  id: "domain-0",
  siteId: SITE.id,
  domain: "villa-site1234.direct.domits.com",
  domainType: "FALLBACK",
  status: "PENDING",
  isPrimary: true,
  verificationDetails: { activationMode: "internal" },
  lastCheckedAt: 1,
};
const CUSTOM_DOMAIN = {
  id: "domain-1",
  siteId: SITE.id,
  domain: "www.example.com",
  domainType: "CUSTOM",
  status: "PENDING",
  isPrimary: false,
  verificationDetails: {
    tenantId: "dt_1",
    certificateArn: "arn:cert",
    certificateStatus: "pending-validation",
    dnsVerified: null,
    dnsInstruction: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
    reason: "certificate_pending",
    lastError: null,
  },
  lastCheckedAt: 2,
};

const buildEvent = ({ method = "GET", body, query = null } = {}) => ({
  httpMethod: method,
  headers: { Authorization: "token" },
  queryStringParameters: query,
  body: body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body),
  requestContext: { requestId: "req-1" },
});

const buildController = ({
  authorizedHostId = HOST_ID,
  site = SITE,
  customDomain = null,
  domains = [FALLBACK_DOMAIN],
  service = {},
} = {}) => {
  const controller = new PropertyController();
  controller.authManager = {
    authorizeGroupRequest:
      authorizedHostId instanceof Error
        ? jest.fn().mockRejectedValue(authorizedHostId)
        : jest.fn().mockResolvedValue(authorizedHostId),
  };
  controller.directBookingWebsiteSiteRepository = { getSiteById: jest.fn().mockResolvedValue(site) };
  controller.directBookingWebsiteDomainRepository = {
    getCustomDomainBySiteId: jest.fn().mockResolvedValue(customDomain),
    listDomainsBySiteId: jest.fn().mockResolvedValue(domains),
  };
  controller.websiteCustomDomainService = {
    requestCustomDomain: jest.fn().mockResolvedValue(CUSTOM_DOMAIN),
    syncCustomDomain: jest.fn().mockResolvedValue({ ...CUSTOM_DOMAIN, status: "VERIFIED" }),
    removeCustomDomain: jest.fn().mockResolvedValue({ ...CUSTOM_DOMAIN, status: "REMOVING" }),
    promoteCustomDomain: jest
      .fn()
      .mockResolvedValue([
        { ...FALLBACK_DOMAIN, isPrimary: false },
        { ...CUSTOM_DOMAIN, status: "ACTIVE", isPrimary: true },
      ]),
    ...service,
  };
  return controller;
};

const parseBody = (response) => JSON.parse(response.body);

describe("website domain endpoints: ownership", () => {
  it("answers 401 in the error envelope when the caller is not logged in", async () => {
    const controller = buildController({ authorizedHostId: new Unauthorized("You must be logged in.") });

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(401);
    expect(parseBody(response)).toEqual({
      error: { code: "unauthorized", message: "You must be logged in.", requestId: "req-1" },
    });
  });

  it("answers 404 for another host's site and never reaches the service", async () => {
    const controller = buildController({ authorizedHostId: "host-2" });

    const response = await controller.createWebsiteDomain(
      buildEvent({ method: "POST", body: { siteId: SITE.id, domain: "www.example.com" } })
    );

    expect(response.statusCode).toBe(404);
    expect(parseBody(response).error.code).toBe("site_not_found");
    expect(controller.websiteCustomDomainService.requestCustomDomain).not.toHaveBeenCalled();
  });

  it("answers 400 when siteId is missing", async () => {
    const controller = buildController();

    const response = await controller.listWebsiteDomains(buildEvent());

    expect(response.statusCode).toBe(400);
    expect(parseBody(response).error.code).toBe("invalid_request");
  });
});

describe("GET /property/website/domains", () => {
  it("refreshes the custom domain first and lists every domain as a host view", async () => {
    const controller = buildController({ customDomain: CUSTOM_DOMAIN, domains: [FALLBACK_DOMAIN, CUSTOM_DOMAIN] });

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.syncCustomDomain).toHaveBeenCalledWith({
      site: SITE,
      domainRecord: CUSTOM_DOMAIN,
    });
    const body = parseBody(response);
    expect(body.siteId).toBe(SITE.id);
    expect(body.domains.map((domain) => domain.domain)).toEqual([FALLBACK_DOMAIN.domain, CUSTOM_DOMAIN.domain]);
    expect(body.domains[1].dnsRecord).toEqual(CUSTOM_DOMAIN.verificationDetails.dnsInstruction);
    expect(response.body).not.toMatch(/dt_1|arn:cert/);
    expect(response.headers["Cache-Control"]).toContain("no-store");
  });

  it("still lists the domains when the CloudFront refresh fails", async () => {
    const controller = buildController({
      customDomain: CUSTOM_DOMAIN,
      domains: [FALLBACK_DOMAIN, CUSTOM_DOMAIN],
      service: {
        syncCustomDomain: jest
          .fn()
          .mockRejectedValue(new WebsiteCustomDomainError(WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.SYNC_FAILED, "down")),
      },
    });

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(200);
    expect(parseBody(response).domains).toHaveLength(2);
  });

  it("syncs a domain that is still waiting for its DNS record so the tenant gets created on load", async () => {
    const waitingDomain = {
      ...CUSTOM_DOMAIN,
      verificationDetails: { ...CUSTOM_DOMAIN.verificationDetails, tenantId: null, reason: "dns_required" },
    };
    const controller = buildController({ customDomain: waitingDomain, domains: [FALLBACK_DOMAIN, waitingDomain] });

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.syncCustomDomain).toHaveBeenCalledWith({
      site: SITE,
      domainRecord: waitingDomain,
    });
  });

  it("returns a failed domain that never got a tenant as stored instead of re-requesting it", async () => {
    const failedDomain = {
      ...CUSTOM_DOMAIN,
      status: "FAILED",
      verificationDetails: { ...CUSTOM_DOMAIN.verificationDetails, tenantId: null, reason: "domain_in_use_elsewhere" },
    };
    const controller = buildController({ customDomain: failedDomain, domains: [FALLBACK_DOMAIN, failedDomain] });

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.syncCustomDomain).not.toHaveBeenCalled();
    expect(parseBody(response).domains[1]).toMatchObject({ status: "FAILED", reason: "domain_in_use_elsewhere" });
  });

  it("does not touch the service when the site has no custom domain", async () => {
    const controller = buildController();

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.syncCustomDomain).not.toHaveBeenCalled();
    expect(parseBody(response).domains).toEqual([expect.objectContaining({ domainType: "FALLBACK", dnsRecord: null })]);
  });
});

describe("DELETE /property/website/domains", () => {
  const removeQuery = { siteId: SITE.id, domain: "www.example.com" };

  it("starts the removal for the site and domain in the query and returns the refreshed domain list", async () => {
    const controller = buildController({
      domains: [
        { ...FALLBACK_DOMAIN, isPrimary: true },
        { ...CUSTOM_DOMAIN, status: "REMOVING", isPrimary: false },
      ],
    });

    const response = await controller.removeWebsiteDomain(buildEvent({ method: "DELETE", query: removeQuery }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.removeCustomDomain).toHaveBeenCalledWith({
      site: SITE,
      domain: "www.example.com",
    });
    expect(parseBody(response).domains.map((entry) => [entry.domain, entry.status, entry.isPrimary])).toEqual([
      [FALLBACK_DOMAIN.domain, expect.any(String), true],
      ["www.example.com", "REMOVING", false],
    ]);
  });

  it("refuses a remove without the domain the host is looking at", async () => {
    const controller = buildController();

    const response = await controller.removeWebsiteDomain(
      buildEvent({ method: "DELETE", query: { siteId: SITE.id } })
    );

    expect(response.statusCode).toBe(400);
    expect(parseBody(response).error.code).toBe("invalid_domain");
    expect(controller.websiteCustomDomainService.removeCustomDomain).not.toHaveBeenCalled();
  });

  it("answers domains_unavailable instead of internal_error when the list read fails after the removal committed", async () => {
    const controller = buildController();
    controller.directBookingWebsiteDomainRepository.listDomainsBySiteId = jest
      .fn()
      .mockRejectedValue(new Error("connection reset"));

    const response = await controller.removeWebsiteDomain(buildEvent({ method: "DELETE", query: removeQuery }));

    expect(controller.websiteCustomDomainService.removeCustomDomain).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(parseBody(response).error).toEqual({
      code: "domains_unavailable",
      message: "The request completed, but the domain list could not be reloaded. Check again to see the current state.",
      requestId: "req-1",
    });
  });

  it("answers the list without the custom entry once the record is gone", async () => {
    const controller = buildController({ service: { removeCustomDomain: jest.fn().mockResolvedValue(null) } });

    const response = await controller.removeWebsiteDomain(buildEvent({ method: "DELETE", query: removeQuery }));

    expect(response.statusCode).toBe(200);
    expect(parseBody(response).domains).toEqual([expect.objectContaining({ domainType: "FALLBACK" })]);
  });

  it("answers 404 for another host's site and never reaches the service", async () => {
    const controller = buildController({ authorizedHostId: "host-2" });

    const response = await controller.removeWebsiteDomain(buildEvent({ method: "DELETE", query: removeQuery }));

    expect(response.statusCode).toBe(404);
    expect(parseBody(response).error.code).toBe("site_not_found");
    expect(controller.websiteCustomDomainService.removeCustomDomain).not.toHaveBeenCalled();
  });

  it("maps a removal failure to the error envelope", async () => {
    const controller = buildController({
      service: {
        removeCustomDomain: jest
          .fn()
          .mockRejectedValue(
            new WebsiteCustomDomainError(WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_REMOVE_FAILED, "Could not remove.")
          ),
      },
    });

    const response = await controller.removeWebsiteDomain(buildEvent({ method: "DELETE", query: removeQuery }));

    expect(response.statusCode).toBe(502);
    expect(parseBody(response).error).toEqual({
      code: "domain_remove_failed",
      message: "Could not remove.",
      requestId: "req-1",
    });
  });
});

describe("POST /property/website/domains", () => {
  it("creates the domain and returns 201 with its status and DNS record", async () => {
    const controller = buildController();

    const response = await controller.createWebsiteDomain(
      buildEvent({ method: "POST", body: { siteId: SITE.id, domain: " WWW.Example.com " } })
    );

    expect(response.statusCode).toBe(201);
    expect(controller.websiteCustomDomainService.requestCustomDomain).toHaveBeenCalledWith({
      site: SITE,
      domain: "WWW.Example.com",
    });
    expect(parseBody(response).domain).toMatchObject({
      domain: "www.example.com",
      status: "PENDING",
      dnsRecord: { type: "CNAME", name: "www.example.com", value: "d3lo.cloudfront.net" },
    });
  });

  it.each([
    ["malformed JSON", "{not json", "invalid_request", 400],
    ["a missing domain", { siteId: SITE.id }, "invalid_domain", 400],
  ])("rejects %s", async (_label, body, code, statusCode) => {
    const controller = buildController();

    const response = await controller.createWebsiteDomain(buildEvent({ method: "POST", body }));

    expect(response.statusCode).toBe(statusCode);
    expect(parseBody(response).error).toMatchObject({ code, requestId: "req-1" });
  });

  it("passes service errors through with their status", async () => {
    const controller = buildController({
      service: {
        requestCustomDomain: jest
          .fn()
          .mockRejectedValue(
            new WebsiteCustomDomainError(WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_LIMIT_REACHED, "One domain only.")
          ),
      },
    });

    const response = await controller.createWebsiteDomain(
      buildEvent({ method: "POST", body: { siteId: SITE.id, domain: "www.other.com" } })
    );

    expect(response.statusCode).toBe(409);
    expect(parseBody(response)).toEqual({
      error: { code: "domain_limit_reached", message: "One domain only.", requestId: "req-1" },
    });
  });

  it("hides unexpected failures behind internal_error", async () => {
    const controller = buildController({
      service: { requestCustomDomain: jest.fn().mockRejectedValue(new Error("boom")) },
    });

    const response = await controller.createWebsiteDomain(
      buildEvent({ method: "POST", body: { siteId: SITE.id, domain: "www.example.com" } })
    );

    expect(response.statusCode).toBe(500);
    expect(parseBody(response).error.code).toBe("internal_error");
    expect(response.body).not.toContain("boom");
  });
});

describe("POST /property/website/domains/verify", () => {
  it("runs a sync and returns the refreshed domain list", async () => {
    const controller = buildController({ domains: [FALLBACK_DOMAIN, { ...CUSTOM_DOMAIN, status: "VERIFIED" }] });

    const response = await controller.verifyWebsiteDomain(buildEvent({ method: "POST", body: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.syncCustomDomain).toHaveBeenCalledWith({ site: SITE });
    expect(parseBody(response).domains.map((entry) => [entry.domainType, entry.status])).toEqual([
      ["FALLBACK", expect.any(String)],
      ["CUSTOM", "VERIFIED"],
    ]);
    expect(JSON.stringify(parseBody(response))).not.toContain("dt_1");
  });

  it("answers domains_unavailable when the list read fails after the sync committed", async () => {
    const controller = buildController();
    controller.directBookingWebsiteDomainRepository.listDomainsBySiteId = jest
      .fn()
      .mockRejectedValue(new Error("connection reset"));

    const response = await controller.verifyWebsiteDomain(buildEvent({ method: "POST", body: { siteId: SITE.id } }));

    expect(controller.websiteCustomDomainService.syncCustomDomain).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBe(500);
    expect(parseBody(response).error.code).toBe("domains_unavailable");
  });

  it("keeps internal_error for a list read failure on GET, where nothing was changed", async () => {
    const controller = buildController();
    controller.directBookingWebsiteDomainRepository.listDomainsBySiteId = jest
      .fn()
      .mockRejectedValue(new Error("connection reset"));

    const response = await controller.listWebsiteDomains(buildEvent({ query: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(500);
    expect(parseBody(response).error.code).toBe("internal_error");
  });

  it("answers 404 when the site has no custom domain", async () => {
    const controller = buildController({
      service: {
        syncCustomDomain: jest
          .fn()
          .mockRejectedValue(
            new WebsiteCustomDomainError(WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_FOUND, "No custom domain.")
          ),
      },
    });

    const response = await controller.verifyWebsiteDomain(buildEvent({ method: "POST", body: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(404);
    expect(parseBody(response).error.code).toBe("domain_not_found");
  });
});

describe("POST /property/website/domains/primary", () => {
  const promoteBody = { siteId: SITE.id, domain: "www.example.com" };

  it("moves the main address for the site and domain in the body and returns every domain as a host view", async () => {
    const controller = buildController();

    const response = await controller.promoteWebsiteDomain(buildEvent({ method: "POST", body: promoteBody }));

    expect(response.statusCode).toBe(200);
    expect(controller.websiteCustomDomainService.promoteCustomDomain).toHaveBeenCalledWith({
      site: SITE,
      domain: "www.example.com",
    });
    const body = parseBody(response);
    expect(body.siteId).toBe(SITE.id);
    expect(body.domains.map((entry) => [entry.domain, entry.isPrimary])).toEqual([
      [FALLBACK_DOMAIN.domain, false],
      ["www.example.com", true],
    ]);
    expect(body.domains[1]).not.toHaveProperty("verificationDetails");
    expect(JSON.stringify(body)).not.toContain("dt_1");
  });

  it("refuses a promote without the domain the host is looking at", async () => {
    const controller = buildController();

    const response = await controller.promoteWebsiteDomain(buildEvent({ method: "POST", body: { siteId: SITE.id } }));

    expect(response.statusCode).toBe(400);
    expect(parseBody(response).error.code).toBe("invalid_domain");
    expect(controller.websiteCustomDomainService.promoteCustomDomain).not.toHaveBeenCalled();
  });

  it("passes a not-live refusal through as 409 domain_not_active", async () => {
    const controller = buildController({
      service: {
        promoteCustomDomain: jest
          .fn()
          .mockRejectedValue(
            new WebsiteCustomDomainError(
              WEBSITE_CUSTOM_DOMAIN_ERROR_CODES.DOMAIN_NOT_ACTIVE,
              "www.example.com must be live before it can be the main address."
            )
          ),
      },
    });

    const response = await controller.promoteWebsiteDomain(buildEvent({ method: "POST", body: promoteBody }));

    expect(response.statusCode).toBe(409);
    expect(parseBody(response).error).toMatchObject({ code: "domain_not_active", requestId: "req-1" });
  });

  it("answers 404 for another host's site and never reaches the service", async () => {
    const controller = buildController({ authorizedHostId: "host-2" });

    const response = await controller.promoteWebsiteDomain(buildEvent({ method: "POST", body: promoteBody }));

    expect(response.statusCode).toBe(404);
    expect(parseBody(response).error.code).toBe("site_not_found");
    expect(controller.websiteCustomDomainService.promoteCustomDomain).not.toHaveBeenCalled();
  });
});
