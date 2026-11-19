import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../rendering/websiteDraftContentOverrides";

const buildModel = (property) =>
  buildWebsiteTemplateModel({
    propertyDetails: {
      property: { id: "property-1", title: "Villa Sensual", ...property },
      location: { city: "Cape Town", country: "South Africa" },
      generalDetails: [{ detail: "Guests", value: 6 }],
    },
  });

describe("a description the template wrote itself", () => {
  it("is marked when the listing has no description", () => {
    const model = buildModel({ description: "   " });

    expect(model.hero.description).toBe("Villa Sensual in Cape Town, South Africa for 6 guests.");
    expect(model.hero.isDescriptionGenerated).toBe(true);
  });

  it("is not marked when the listing has a description", () => {
    const model = buildModel({ description: "A villa above the bay." });

    expect(model.hero.description).toBe("A villa above the bay.");
    expect(model.hero.isDescriptionGenerated).toBe(false);
  });

  it("is no longer marked once the host writes a description in the editor", () => {
    const model = applyWebsiteDraftContentOverrides(buildModel({ description: "" }), {
      heroDescription: "Written by the host.",
    });

    expect(model.hero.description).toBe("Written by the host.");
    expect(model.hero.isDescriptionGenerated).toBe(false);
  });

  it("stays marked when the editor only holds an empty description", () => {
    const model = applyWebsiteDraftContentOverrides(buildModel({ description: "" }), { heroDescription: "  " });

    expect(model.hero.isDescriptionGenerated).toBe(true);
  });

  it("keeps a listing description unmarked through overrides that do not touch it", () => {
    const model = applyWebsiteDraftContentOverrides(buildModel({ description: "A villa above the bay." }), {
      heroTitle: "Sensual",
    });

    expect(model.hero.isDescriptionGenerated).toBe(false);
  });
});
