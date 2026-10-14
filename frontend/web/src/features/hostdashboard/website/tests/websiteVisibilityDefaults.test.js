import { createEmptyWebsiteDraftEditorValues } from "../rendering/websiteDraftContentOverrides";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";

describe("direct booking website visibility defaults", () => {
  it("shows the booking panel on new drafts", () => {
    expect(createEmptyWebsiteDraftEditorValues("panorama-landing").visibility.quotePanel).toBe(true);
  });

  it("shows the booking panel on published sites that never touched the toggle", () => {
    const model = buildWebsiteTemplateModel({ propertyDetails: {} });
    expect(model.visibility.quotePanel).toBe(true);
    expect(model.visibility.availabilityCalendar).toBe(true);
  });
});
