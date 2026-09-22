import { describe, expect, it, jest } from "@jest/globals";
import { PropertyController } from "../../functions/PropertyHandler/controller/propertyController.js";

const HOST_ID = "host-1";
const PROPERTY_ID = "property-1";
const SITE = { id: "site-1", propertyId: PROPERTY_ID, hostId: HOST_ID, status: "PUBLISHED" };
const DRAFT = { id: "draft-1", templateKey: "panorama" };
const CUSTOM_WITH_TENANT = {
  id: "domain-1",
  siteId: SITE.id,
  domain: "www.example.com",
  domainType: "CUSTOM",
  status: "ACTIVE",
  verificationDetails: { tenantId: "dt_1" },
};
const CUSTOM_WITHOUT_TENANT = {
  ...CUSTOM_WITH_TENANT,
  status: "PENDING",
  verificationDetails: { tenantId: null, reason: "dns_required" },
};

const buildEvent = () => ({
  httpMethod: "DELETE",
  headers: { Authorization: "token" },
  body: JSON.stringify({ propertyId: PROPERTY_ID }),
});

const buildController = ({ customDomain = null, service = null, serviceFactory = null } = {}) => {
  const controller = new PropertyController();
  controller.authManager = {
    authorizeGroupRequest: jest.fn().mockResolvedValue(HOST_ID),
    authorizeOwnerRequest: jest.fn().mockResolvedValue(undefined),
  };
  controller.directBookingWebsiteDraftRepository = {
    getDraftByPropertyIdAndHostId: jest.fn().mockResolvedValue(DRAFT),
    deleteDraftByPropertyIdAndHostId: jest.fn().mockResolvedValue(undefined),
  };
  controller.directBookingWebsiteSiteRepository = {
    getSiteByPropertyIdAndHostId: jest.fn().mockResolvedValue(SITE),
    deleteSiteByPropertyIdAndHostId: jest.fn().mockResolvedValue(SITE),
  };
  controller.directBookingWebsiteDomainRepository = {
    getCustomDomainBySiteId: jest.fn().mockResolvedValue(customDomain),
    deleteDomainsBySiteId: jest.fn().mockResolvedValue(undefined),
  };
  controller.directBookingWebsiteEventRepository = { recordEvent: jest.fn().mockResolvedValue(undefined) };
  if (serviceFactory) {
    controller.getWebsiteCustomDomainService = serviceFactory;
  } else {
    controller.websiteCustomDomainService = service || { releaseTenantForSite: jest.fn().mockResolvedValue(null) };
  }
  return controller;
};

describe("DELETE /property/website/draft and the custom domain tenant", () => {
  it("disables the tenant before the domain rows are deleted when the custom domain has one", async () => {
    const service = { releaseTenantForSite: jest.fn().mockResolvedValue({ id: "dt_1", enabled: false }) };
    const controller = buildController({ customDomain: CUSTOM_WITH_TENANT, service });

    const response = await controller.deleteWebsiteDraft(buildEvent());

    expect(response.statusCode).toBe(204);
    expect(service.releaseTenantForSite).toHaveBeenCalledWith({ site: SITE, record: CUSTOM_WITH_TENANT });
    expect(service.releaseTenantForSite.mock.invocationCallOrder[0]).toBeLessThan(
      controller.directBookingWebsiteDomainRepository.deleteDomainsBySiteId.mock.invocationCallOrder[0]
    );
    expect(controller.directBookingWebsiteDomainRepository.deleteDomainsBySiteId).toHaveBeenCalledWith(SITE.id);
    expect(controller.directBookingWebsiteSiteRepository.deleteSiteByPropertyIdAndHostId).toHaveBeenCalledWith(
      PROPERTY_ID,
      HOST_ID
    );
  });

  it.each([
    ["no custom domain", null],
    ["a custom domain that never got a tenant", CUSTOM_WITHOUT_TENANT],
  ])(
    "never constructs the domain service with %s, so deletion works without CloudFront configuration",
    async (_label, customDomain) => {
      const serviceFactory = jest.fn(() => {
        throw new TypeError("Missing custom domain configuration: DIRECT_BOOKING_WEBSITE_CLOUDFRONT_DISTRIBUTION_ID.");
      });
      const controller = buildController({ customDomain, serviceFactory });

      const response = await controller.deleteWebsiteDraft(buildEvent());

      expect(response.statusCode).toBe(204);
      expect(serviceFactory).not.toHaveBeenCalled();
      expect(controller.directBookingWebsiteDomainRepository.deleteDomainsBySiteId).toHaveBeenCalledWith(SITE.id);
      expect(controller.directBookingWebsiteDraftRepository.deleteDraftByPropertyIdAndHostId).toHaveBeenCalledWith(
        PROPERTY_ID,
        HOST_ID
      );
    }
  );

  it("still deletes the website and logs when disabling the tenant fails", async () => {
    const failure = new Error("PreconditionFailed");
    const service = { releaseTenantForSite: jest.fn().mockRejectedValue(failure) };
    const controller = buildController({ customDomain: CUSTOM_WITH_TENANT, service });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await controller.deleteWebsiteDraft(buildEvent());

      expect(response.statusCode).toBe(204);
      expect(controller.directBookingWebsiteDomainRepository.deleteDomainsBySiteId).toHaveBeenCalledWith(SITE.id);
      expect(controller.directBookingWebsiteSiteRepository.deleteSiteByPropertyIdAndHostId).toHaveBeenCalledWith(
        PROPERTY_ID,
        HOST_ID
      );
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(
          "[CustomDomain] disabling the tenant for www.example.com on website delete failed (site site-1)."
        ),
        failure
      );
    } finally {
      consoleError.mockRestore();
    }
  });

  it("still deletes the website when the service cannot be built for a row that has a tenant", async () => {
    const serviceFactory = jest.fn(() => {
      throw new TypeError("Missing custom domain configuration: DIRECT_BOOKING_WEBSITE_CLOUDFRONT_DISTRIBUTION_ID.");
    });
    const controller = buildController({ customDomain: CUSTOM_WITH_TENANT, serviceFactory });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await controller.deleteWebsiteDraft(buildEvent());

      expect(response.statusCode).toBe(204);
      expect(serviceFactory).toHaveBeenCalledTimes(1);
      expect(controller.directBookingWebsiteDomainRepository.deleteDomainsBySiteId).toHaveBeenCalledWith(SITE.id);
    } finally {
      consoleError.mockRestore();
    }
  });
});
