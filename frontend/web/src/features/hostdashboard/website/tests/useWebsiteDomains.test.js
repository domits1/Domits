import { renderHook, waitFor } from "@testing-library/react";
import { WEBSITE_DOMAINS_STATUS, useWebsiteDomains } from "../domains/useWebsiteDomains";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import { fetchWebsiteDomains } from "../services/websiteDomainService";

jest.mock("../services/websiteSiteService", () => ({ fetchWebsiteSiteByPropertyId: jest.fn() }));
jest.mock("../services/websiteDomainService", () => ({
  fetchWebsiteDomains: jest.fn(),
  connectWebsiteDomain: jest.fn(),
  verifyWebsiteDomain: jest.fn(),
}));

const summaryFor = (siteId) => ({ site: { id: siteId, status: "PUBLISHED" }, primaryDomain: null, domains: [] });
const fallbackFor = (siteId) => ({ domain: `${siteId}.direct.domits.com`, domainType: "FALLBACK", status: "ACTIVE" });

describe("useWebsiteDomains", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchWebsiteSiteByPropertyId.mockImplementation(async (propertyId) => summaryFor(`site-for-${propertyId}`));
    fetchWebsiteDomains.mockImplementation(async (siteId) => [fallbackFor(siteId)]);
  });

  it("starts over for a new property instead of keeping the previous site's domains", async () => {
    const { result, rerender } = renderHook(({ propertyId }) => useWebsiteDomains({ propertyId, enabled: true }), {
      initialProps: { propertyId: "property-1" },
    });
    await waitFor(() => expect(result.current.status).toBe(WEBSITE_DOMAINS_STATUS.READY));
    expect(result.current.domains[0].domain).toBe("site-for-property-1.direct.domits.com");

    rerender({ propertyId: "property-2" });

    await waitFor(() => expect(result.current.domains[0]?.domain).toBe("site-for-property-2.direct.domits.com"));
    expect(fetchWebsiteSiteByPropertyId).toHaveBeenLastCalledWith("property-2");
    expect(fetchWebsiteDomains).toHaveBeenLastCalledWith("site-for-property-2");
  });
});
