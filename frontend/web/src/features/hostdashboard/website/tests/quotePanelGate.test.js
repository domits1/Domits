import { resolveQuotePanelSiteId } from "../rendering/booking/quotePanelGate";

const liveContext = { siteId: "site-1" };
const optedInModel = { visibility: { quotePanel: true, availabilityCalendar: true } };

describe("resolveQuotePanelSiteId", () => {
  it("returns the site id only on the live surface for an opted-in site", () => {
    expect(resolveQuotePanelSiteId({ quoteContext: liveContext, model: optedInModel })).toBe("site-1");
  });

  it("returns null without a site id (editor and draft preview surfaces)", () => {
    expect(resolveQuotePanelSiteId({ quoteContext: null, model: optedInModel })).toBeNull();
    expect(resolveQuotePanelSiteId({ quoteContext: { siteId: "  " }, model: optedInModel })).toBeNull();
  });

  it("returns null until the host opts in — a missing flag is off", () => {
    expect(resolveQuotePanelSiteId({ quoteContext: liveContext, model: { visibility: {} } })).toBeNull();
    expect(
      resolveQuotePanelSiteId({ quoteContext: liveContext, model: { visibility: { quotePanel: false } } })
    ).toBeNull();
  });

  it("returns null inside the editor even with a site id", () => {
    expect(
      resolveQuotePanelSiteId({ quoteContext: liveContext, model: optedInModel, onSelectTarget: () => {} })
    ).toBeNull();
  });

  it("needs the availability calendar it is built around", () => {
    expect(
      resolveQuotePanelSiteId({
        quoteContext: liveContext,
        model: { visibility: { quotePanel: true, availabilityCalendar: false } },
      })
    ).toBeNull();
  });
});
