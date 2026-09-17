import { act, renderHook, waitFor } from "@testing-library/react";
import { WEBSITE_DOMAINS_STATUS, useWebsiteDomains } from "../domains/useWebsiteDomains";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import {
  fetchWebsiteDomains,
  promoteWebsiteDomain,
  removeWebsiteDomain,
  verifyWebsiteDomain,
} from "../services/websiteDomainService";

jest.mock("../services/websiteSiteService", () => ({ fetchWebsiteSiteByPropertyId: jest.fn() }));
jest.mock("../services/websiteDomainService", () => ({
  fetchWebsiteDomains: jest.fn(),
  connectWebsiteDomain: jest.fn(),
  verifyWebsiteDomain: jest.fn(),
  removeWebsiteDomain: jest.fn(),
  promoteWebsiteDomain: jest.fn(),
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

  it("keeps a domain that is being removed and drops it once the server says it is gone", async () => {
    const custom = { domain: "www.example.com", domainType: "CUSTOM", status: "ACTIVE" };
    fetchWebsiteDomains.mockImplementation(async (siteId) => [fallbackFor(siteId), custom]);
    removeWebsiteDomain.mockResolvedValue([fallbackFor("site-for-property-1"), { ...custom, status: "REMOVING" }]);
    verifyWebsiteDomain.mockResolvedValue([fallbackFor("site-for-property-1")]);
    const { result } = renderHook(() => useWebsiteDomains({ propertyId: "property-1", enabled: true }));
    await waitFor(() => expect(result.current.customDomain?.status).toBe("ACTIVE"));

    await act(() => result.current.remove("www.example.com"));

    expect(removeWebsiteDomain).toHaveBeenCalledWith({ siteId: "site-for-property-1", domain: "www.example.com" });
    expect(result.current.customDomain).toMatchObject({ status: "REMOVING" });
    expect(result.current.isRemoving).toBe(false);

    await act(() => result.current.checkAgain());

    expect(result.current.customDomain).toBeNull();
    expect(result.current.domains).toHaveLength(1);
    expect(result.current.status).toBe(WEBSITE_DOMAINS_STATUS.READY);
  });

  it("replaces the whole list once the main address moved so both rows show the new flag", async () => {
    const fallback = { ...fallbackFor("site-for-property-1"), isPrimary: true };
    const custom = { domain: "www.example.com", domainType: "CUSTOM", status: "ACTIVE", isPrimary: false };
    fetchWebsiteDomains.mockResolvedValue([fallback, custom]);
    promoteWebsiteDomain.mockResolvedValue([
      { ...fallback, isPrimary: false },
      { ...custom, isPrimary: true },
    ]);
    const { result } = renderHook(() => useWebsiteDomains({ propertyId: "property-1", enabled: true }));
    await waitFor(() => expect(result.current.customDomain?.status).toBe("ACTIVE"));

    await act(() => result.current.promote("www.example.com"));

    expect(promoteWebsiteDomain).toHaveBeenCalledWith({ siteId: "site-for-property-1", domain: "www.example.com" });
    expect(result.current.domains.map((entry) => [entry.domain, entry.isPrimary])).toEqual([
      [fallback.domain, false],
      ["www.example.com", true],
    ]);
    expect(result.current.isPromoting).toBe(false);
    expect(result.current.notice).toBeNull();
  });

  it("shows a promote refusal as a panel notice and keeps the list as it was", async () => {
    const custom = { domain: "www.example.com", domainType: "CUSTOM", status: "ACTIVE", isPrimary: false };
    fetchWebsiteDomains.mockImplementation(async (siteId) => [fallbackFor(siteId), custom]);
    promoteWebsiteDomain.mockRejectedValue(
      Object.assign(new Error("Not live."), { code: "domain_not_active", requestId: "req-1" })
    );
    const { result } = renderHook(() => useWebsiteDomains({ propertyId: "property-1", enabled: true }));
    await waitFor(() => expect(result.current.customDomain?.status).toBe("ACTIVE"));

    await act(() => result.current.promote("www.example.com"));

    expect(result.current.notice).toMatchObject({ scope: "panel", requestId: "req-1" });
    expect(result.current.notice.message).toMatch(/only a live domain/i);
    expect(result.current.fieldError).toBe("");
    expect(result.current.domains).toHaveLength(2);
    expect(fetchWebsiteDomains).toHaveBeenCalledTimes(1);
  });
});
