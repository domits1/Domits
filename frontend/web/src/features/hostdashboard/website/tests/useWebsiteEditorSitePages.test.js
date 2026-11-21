import { act, renderHook, waitFor } from "@testing-library/react";
import { useWebsiteEditorSitePages } from "../editor/hooks/useWebsiteEditorSitePages";
import { WEBSITE_ENTITLEMENT_UNLIMITED_PAGES, getWebsiteEntitlements } from "../services/websitePlanService";

jest.mock("../services/websitePlanService", () => ({
  ...jest.requireActual("../services/websitePlanService"),
  getWebsiteEntitlements: jest.fn(),
}));

const STORED = { sitePages: { gallery: { enabled: true, navLabel: "Photos" } } };

const renderSitePages = async (entitlements, draftTemplateKey = "panorama-landing") => {
  getWebsiteEntitlements.mockResolvedValue(entitlements);
  const hook = renderHook(() => useWebsiteEditorSitePages({ draftTemplateKey, workingOverrides: STORED }));
  await waitFor(() => expect(getWebsiteEntitlements).toHaveBeenCalled());
  await act(async () => {});
  return hook;
};

describe("useWebsiteEditorSitePages", () => {
  it.each([
    ["an Essentials host", ["website.basic"], "panorama-landing"],
    ["an Elite host on a template without pages", [WEBSITE_ENTITLEMENT_UNLIMITED_PAGES], "trust-signals"],
  ])("hands no page edit to the save for %s", async (_name, entitlements, templateKey) => {
    const { result } = await renderSitePages(entitlements, templateKey);

    act(() => result.current.setSitePageEnabled("contact", true));

    expect(result.current.canEditSitePages).toBe(false);
    expect(result.current.sitePagesEdit).toBeNull();
  });

  it("edits the stored pages of an Elite host and forgets the edit on reset", async () => {
    const { result } = await renderSitePages([WEBSITE_ENTITLEMENT_UNLIMITED_PAGES]);

    act(() => result.current.setSitePageEnabled("contact", true));
    act(() => result.current.setSitePageNavLabel("contact", " Reach us "));

    expect(result.current.sitePagesEdit).toEqual({
      gallery: { enabled: true, navLabel: "Photos" },
      accommodation: { enabled: false, navLabel: "Accommodation" },
      contact: { enabled: true, navLabel: " Reach us " },
    });

    act(() => result.current.resetSitePagesEdit());

    expect(result.current.sitePagesEdit).toBeNull();
    expect(result.current.sitePages.contact).toEqual({ enabled: false, navLabel: "Contact us" });
  });
});
