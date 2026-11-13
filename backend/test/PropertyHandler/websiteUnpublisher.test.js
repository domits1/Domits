import { describe, expect, it, jest } from "@jest/globals";
import { WebsiteUnpublisher } from "../../functions/PropertyHandler/business/service/websiteUnpublisher.js";

const SITE = { id: "site-1", propertyId: "property-1", hostId: "host-1", status: "PUBLISHED" };
const PREVIEW_SITE = { ...SITE, status: "PREVIEW" };
const DISABLED_DOMAIN = { domain: "cliff-house-site-1.direct.domits.com", status: "DISABLED" };

const buildUnpublisher = ({ liveDomain = DISABLED_DOMAIN } = {}) => {
  const repositories = {
    siteRepository: { updateSiteStatusWithStaticPageOutbox: jest.fn().mockResolvedValue(PREVIEW_SITE) },
    domainRepository: { updateFallbackDomainStatus: jest.fn().mockResolvedValue(liveDomain) },
    eventRepository: { recordEvent: jest.fn().mockResolvedValue(undefined) },
  };
  return { unpublisher: new WebsiteUnpublisher(repositories), ...repositories };
};

const takeDownInput = { site: SITE, draftId: "draft-1", hostId: "host-1", propertyId: "property-1" };

describe("WebsiteUnpublisher", () => {
  it("returns the PREVIEW site and the disabled fallback domain", async () => {
    const { unpublisher } = buildUnpublisher();

    await expect(unpublisher.takeDown(takeDownInput)).resolves.toEqual({
      site: PREVIEW_SITE,
      liveDomain: DISABLED_DOMAIN,
    });
  });

  it("queues the page withdrawal through the status update, not by deleting pages itself", async () => {
    const { unpublisher, siteRepository, domainRepository } = buildUnpublisher();

    await unpublisher.takeDown(takeDownInput);

    expect(siteRepository.updateSiteStatusWithStaticPageOutbox).toHaveBeenCalledWith(SITE.id, "PREVIEW");
    expect(domainRepository.updateFallbackDomainStatus).toHaveBeenCalledWith(SITE.id, "DISABLED", {
      activationMode: "internal",
      disabledByHost: true,
      routingConfigured: false,
    });
  });

  it("does not touch the domain or record an event when the site update fails", async () => {
    const { unpublisher, siteRepository, domainRepository, eventRepository } = buildUnpublisher();
    siteRepository.updateSiteStatusWithStaticPageOutbox.mockRejectedValue(new Error("transaction failed"));

    await expect(unpublisher.takeDown(takeDownInput)).rejects.toThrow("transaction failed");

    expect(domainRepository.updateFallbackDomainStatus).not.toHaveBeenCalled();
    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("fails when the domain update fails, so the caller can retry the take-down", async () => {
    const { unpublisher, domainRepository, eventRepository } = buildUnpublisher();
    domainRepository.updateFallbackDomainStatus.mockRejectedValue(new Error("domain write failed"));

    await expect(unpublisher.takeDown(takeDownInput)).rejects.toThrow("domain write failed");

    expect(eventRepository.recordEvent).not.toHaveBeenCalled();
  });

  it("reports an empty domain with DISABLED when the site has no fallback domain row", async () => {
    const { unpublisher, eventRepository } = buildUnpublisher({ liveDomain: null });

    const { liveDomain } = await unpublisher.takeDown({ ...takeDownInput, draftId: undefined });

    expect(liveDomain).toBeNull();
    expect(eventRepository.recordEvent).toHaveBeenCalledWith({
      draftId: null,
      propertyId: "property-1",
      hostId: "host-1",
      eventType: "WEBSITE_SITE_UNPUBLISHED",
      payload: { siteId: SITE.id, domain: "", domainStatus: "DISABLED" },
    });
  });

  it("adds the reason to the event payload only when one is given", async () => {
    const withoutReason = buildUnpublisher();
    await withoutReason.unpublisher.takeDown(takeDownInput);
    const withReason = buildUnpublisher();
    await withReason.unpublisher.takeDown({ ...takeDownInput, reason: "property_not_active" });

    const payloadOf = ({ eventRepository }) => eventRepository.recordEvent.mock.calls[0][0].payload;
    expect(payloadOf(withoutReason)).toEqual({
      siteId: SITE.id,
      domain: DISABLED_DOMAIN.domain,
      domainStatus: "DISABLED",
    });
    expect(payloadOf(withReason)).toEqual({ ...payloadOf(withoutReason), reason: "property_not_active" });
  });

  it("keeps the take-down when the audit event cannot be recorded", async () => {
    const { unpublisher, eventRepository } = buildUnpublisher();
    eventRepository.recordEvent.mockRejectedValue(new Error("event store down"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(unpublisher.takeDown(takeDownInput)).resolves.toMatchObject({ site: PREVIEW_SITE });

    expect(consoleError).toHaveBeenCalledWith("Failed to record direct booking website event.", expect.any(Error));
    consoleError.mockRestore();
  });
});
