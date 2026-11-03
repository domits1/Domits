import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const HOST_ID = "host-1";
const PROPERTY_ID = "property-1";
const DRAFT = { id: "draft-1", templateKey: "panorama" };
const PUBLISHED_SITE = { id: "site-1", propertyId: PROPERTY_ID, hostId: HOST_ID, status: "PUBLISHED" };
const PREVIEW_SITE = { ...PUBLISHED_SITE, status: "PREVIEW" };
const DISABLED_DOMAIN = {
  id: "domain-1",
  siteId: PUBLISHED_SITE.id,
  domain: "cliff-house-site-1.direct.domits.com",
  domainType: "FALLBACK",
  status: "DISABLED",
  isPrimary: true,
};

const buildEvent = () => ({
  httpMethod: "POST",
  headers: { Authorization: "token" },
  body: JSON.stringify({ propertyId: PROPERTY_ID }),
});

const buildController = ({ site = PUBLISHED_SITE, draft = DRAFT, liveDomain = DISABLED_DOMAIN, allDomains = [] } = {}) => {
  const controller = new PropertyController();
  controller.authManager = {
    authorizeGroupRequest: jest.fn().mockResolvedValue(HOST_ID),
    authorizeOwnerRequest: jest.fn().mockResolvedValue(undefined),
  };
  controller.directBookingWebsiteDraftRepository = {
    getDraftByPropertyIdAndHostId: jest.fn().mockResolvedValue(draft),
  };
  controller.directBookingWebsiteSiteRepository = {
    getSiteByPropertyIdAndHostId: jest.fn().mockResolvedValue(site),
    updateSiteStatusWithStaticPageOutbox: jest.fn().mockResolvedValue(PREVIEW_SITE),
  };
  controller.directBookingWebsiteDomainRepository = {
    updateFallbackDomainStatus: jest.fn().mockResolvedValue(liveDomain),
    listDomainsBySiteId: jest.fn().mockResolvedValue(allDomains),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  return controller;
};

const parseBody = (response) => JSON.parse(response.body);

describe("POST /property/website/site/unpublish", () => {
  it("moves the site to PREVIEW and disables the fallback domain as the host", async () => {
    const controller = buildController();

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(response.statusCode).toBe(200);
    expect(controller.authManager.authorizeOwnerRequest).toHaveBeenCalledWith("token", PROPERTY_ID);
    expect(controller.directBookingWebsiteSiteRepository.getSiteByPropertyIdAndHostId).toHaveBeenCalledWith(
      PROPERTY_ID,
      HOST_ID
    );
    expect(controller.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox).toHaveBeenCalledWith(
      PUBLISHED_SITE.id,
      "PREVIEW"
    );
    expect(controller.directBookingWebsiteDomainRepository.updateFallbackDomainStatus).toHaveBeenCalledWith(
      PUBLISHED_SITE.id,
      "DISABLED",
      { activationMode: "internal", disabledByHost: true, routingConfigured: false }
    );
  });

  it("takes the site down before it disables the domain and records the event", async () => {
    const controller = buildController();

    await controller.unpublishWebsiteSite(buildEvent());

    const siteOrder =
      controller.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox.mock.invocationCallOrder[0];
    const domainOrder =
      controller.directBookingWebsiteDomainRepository.updateFallbackDomainStatus.mock.invocationCallOrder[0];
    const eventOrder = controller.directBookingWebsiteEventRepository.recordEvent.mock.invocationCallOrder[0];
    expect(siteOrder).toBeLessThan(domainOrder);
    expect(domainOrder).toBeLessThan(eventOrder);
  });

  it("records WEBSITE_SITE_UNPUBLISHED with the draft, the domain and its status", async () => {
    const controller = buildController();

    await controller.unpublishWebsiteSite(buildEvent());

    expect(controller.directBookingWebsiteEventRepository.recordEvent).toHaveBeenCalledWith({
      draftId: DRAFT.id,
      propertyId: PROPERTY_ID,
      hostId: HOST_ID,
      eventType: "WEBSITE_SITE_UNPUBLISHED",
      payload: {
        siteId: PUBLISHED_SITE.id,
        domain: DISABLED_DOMAIN.domain,
        domainStatus: "DISABLED",
      },
    });
  });

  it("returns the PREVIEW site as unreachable with the disabled domain", async () => {
    const controller = buildController();

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(parseBody(response)).toMatchObject({
      site: { id: PUBLISHED_SITE.id, status: "PREVIEW" },
      primaryDomain: { domain: DISABLED_DOMAIN.domain, status: "DISABLED" },
      domains: [{ domain: DISABLED_DOMAIN.domain, status: "DISABLED" }],
      isReachable: false,
    });
  });

  it("lists the stored domains and reports a DISABLED event when there is no fallback domain row", async () => {
    const storedDomain = { ...DISABLED_DOMAIN, domainType: "CUSTOM", status: "ACTIVE", isPrimary: false };
    const controller = buildController({ liveDomain: null, allDomains: [storedDomain] });

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(response.statusCode).toBe(200);
    expect(controller.directBookingWebsiteDomainRepository.listDomainsBySiteId).toHaveBeenCalledWith(
      PUBLISHED_SITE.id
    );
    expect(parseBody(response).domains).toEqual([expect.objectContaining({ domain: storedDomain.domain })]);
    expect(controller.directBookingWebsiteEventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { siteId: PUBLISHED_SITE.id, domain: "", domainStatus: "DISABLED" } })
    );
  });

  it("records the event without a draft when the host has no draft", async () => {
    const controller = buildController({ draft: null });

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(response.statusCode).toBe(200);
    expect(controller.directBookingWebsiteEventRepository.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ draftId: null })
    );
  });

  it("still unpublishes when recording the event fails", async () => {
    const controller = buildController();
    controller.directBookingWebsiteEventRepository.recordEvent.mockRejectedValue(new Error("event store down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(response.statusCode).toBe(200);
    expect(consoleError).toHaveBeenCalledWith("Failed to record direct booking website event.", expect.any(Error));
    consoleError.mockRestore();
  });

  it("answers 404 and writes nothing when the property has no site", async () => {
    const controller = buildController({ site: null });

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(response.statusCode).toBe(404);
    expect(controller.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox).not.toHaveBeenCalled();
    expect(controller.directBookingWebsiteDomainRepository.updateFallbackDomainStatus).not.toHaveBeenCalled();
    expect(controller.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("answers a server error and leaves the domain alone when the site update fails", async () => {
    const controller = buildController();
    controller.directBookingWebsiteSiteRepository.updateSiteStatusWithStaticPageOutbox.mockRejectedValue(
      new Error("transaction failed")
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const response = await controller.unpublishWebsiteSite(buildEvent());

    expect(response.statusCode).toBe(500);
    expect(controller.directBookingWebsiteDomainRepository.updateFallbackDomainStatus).not.toHaveBeenCalled();
    expect(controller.directBookingWebsiteEventRepository.recordEvent).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
