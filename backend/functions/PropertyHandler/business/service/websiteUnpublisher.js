const UNPUBLISHED_SITE_STATUS = "PREVIEW";
const DISABLED_DOMAIN_STATUS = "DISABLED";

export class WebsiteUnpublisher {
  constructor({ siteRepository, domainRepository, eventRepository }) {
    this.siteRepository = siteRepository;
    this.domainRepository = domainRepository;
    this.eventRepository = eventRepository;
  }

  async takeDown({ site, draftId = null, hostId, propertyId, reason }) {
    const unpublishedSite = await this.siteRepository.updateSiteStatusWithStaticPageOutbox(
      site.id,
      UNPUBLISHED_SITE_STATUS
    );
    const liveDomain = await this.domainRepository.updateFallbackDomainStatus(site.id, DISABLED_DOMAIN_STATUS, {
      activationMode: "internal",
      disabledByHost: true,
      routingConfigured: false,
    });

    await this.#recordUnpublished({ site, liveDomain, draftId, hostId, propertyId, reason });

    return { site: unpublishedSite, liveDomain };
  }

  async #recordUnpublished({ site, liveDomain, draftId, hostId, propertyId, reason }) {
    try {
      await this.eventRepository.recordEvent({
        draftId,
        propertyId,
        hostId,
        eventType: "WEBSITE_SITE_UNPUBLISHED",
        payload: {
          siteId: site.id,
          domain: liveDomain?.domain || "",
          domainStatus: liveDomain?.status || DISABLED_DOMAIN_STATUS,
          ...(reason ? { reason } : {}),
        },
      });
    } catch (error) {
      console.error("Failed to record direct booking website event.", error);
    }
  }
}

export default WebsiteUnpublisher;
