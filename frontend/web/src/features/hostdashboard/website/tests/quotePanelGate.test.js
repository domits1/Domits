import { resolveQuotePanelVisibility } from "../rendering/booking/quotePanelGate";

const liveContext = { siteId: "site-1" };
const optedInModel = { visibility: { quotePanel: true, availabilityCalendar: true } };

describe("resolveQuotePanelVisibility", () => {
  it("renders only on the live surface for an opted-in site", () => {
    expect(resolveQuotePanelVisibility({ quoteContext: liveContext, model: optedInModel })).toBe(true);
  });

  it("stays hidden without a site id (editor and draft preview surfaces)", () => {
    expect(resolveQuotePanelVisibility({ quoteContext: null, model: optedInModel })).toBe(false);
    expect(resolveQuotePanelVisibility({ quoteContext: { siteId: "" }, model: optedInModel })).toBe(false);
  });

  it("stays hidden until the host opts in — a missing flag is off", () => {
    expect(resolveQuotePanelVisibility({ quoteContext: liveContext, model: { visibility: {} } })).toBe(false);
    expect(
      resolveQuotePanelVisibility({ quoteContext: liveContext, model: { visibility: { quotePanel: false } } })
    ).toBe(false);
  });

  it("stays hidden inside the editor even with a site id", () => {
    expect(
      resolveQuotePanelVisibility({ quoteContext: liveContext, model: optedInModel, onSelectTarget: () => {} })
    ).toBe(false);
  });

  it("needs the availability calendar it is built around", () => {
    expect(
      resolveQuotePanelVisibility({
        quoteContext: liveContext,
        model: { visibility: { quotePanel: true, availabilityCalendar: false } },
      })
    ).toBe(false);
  });
});
