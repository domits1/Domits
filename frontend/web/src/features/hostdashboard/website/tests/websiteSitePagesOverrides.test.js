import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import {
  applyWebsiteDraftContentOverrides,
  buildWebsiteDraftOverridePatch,
  mergeWebsiteDraftContentOverrides,
} from "../rendering/websiteDraftContentOverrides";
import { buildEditorValuesFromDraft } from "../editor/websiteEditorUtils";

const TEMPLATE_KEY = "panorama-landing";
const buildModel = () => buildWebsiteTemplateModel({ propertyDetails: {} });

const STORED_SITE_PAGES = {
  gallery: { enabled: true, navLabel: "  Photos " },
  experiences: { enabled: true },
  contact: { enabled: "yes", navLabel: "<b>Contact</b>" },
};

const saveFromEditor = (contentOverrides, editValues = (values) => values) => {
  const baseModel = buildModel();
  const editorValues = editValues(buildEditorValuesFromDraft(baseModel, { contentOverrides }, TEMPLATE_KEY));
  const patch = buildWebsiteDraftOverridePatch(editorValues, baseModel, TEMPLATE_KEY);
  return { patch, saved: mergeWebsiteDraftContentOverrides(contentOverrides, patch) };
};

const renameSite = (values) => ({ ...values, common: { ...values.common, siteTitle: "Villa Sol" } });

describe("site page settings in the template model", () => {
  it("adds no page field for a site without page settings", () => {
    const model = applyWebsiteDraftContentOverrides(buildModel(), { siteTitle: "Villa Sol" }, TEMPLATE_KEY);

    expect(model).not.toHaveProperty("sitePages");
  });

  it("adds the normalized page settings and changes nothing else", () => {
    const overrides = { siteTitle: "Villa Sol", heroTitle: "Sea view" };
    const withoutPages = applyWebsiteDraftContentOverrides(buildModel(), overrides, TEMPLATE_KEY);
    const { sitePages, ...rest } = applyWebsiteDraftContentOverrides(
      buildModel(),
      { ...overrides, sitePages: STORED_SITE_PAGES },
      TEMPLATE_KEY
    );

    expect(rest).toEqual(withoutPages);
    expect(sitePages).toEqual({
      gallery: { enabled: true, navLabel: "Photos" },
      accommodation: { enabled: false, navLabel: "Accommodation" },
      contact: { enabled: false, navLabel: "Contact us" },
    });
  });

  it("switches every page off for page settings that are not an object", () => {
    const model = applyWebsiteDraftContentOverrides(buildModel(), { sitePages: "gallery" }, TEMPLATE_KEY);

    expect(Object.values(model.sitePages).map((page) => page.enabled)).toEqual([false, false, false]);
  });
});

describe("site page settings in an editor save", () => {
  it("keeps the stored page settings exactly as they are when other fields change", () => {
    const contentOverrides = { siteTitle: "Old title", sitePages: STORED_SITE_PAGES };
    const storedText = JSON.stringify(STORED_SITE_PAGES);

    const { patch, saved } = saveFromEditor(contentOverrides, renameSite);

    expect(patch).not.toHaveProperty("sitePages");
    expect(saved.siteTitle).toBe("Villa Sol");
    expect(JSON.stringify(saved.sitePages)).toBe(storedText);
  });

  it("adds no page settings to the save of a site that has none", () => {
    const { saved } = saveFromEditor({ siteTitle: "Old title" }, renameSite);

    expect(saved).toEqual({ siteTitle: "Villa Sol" });
  });

  it("reopens a saved draft with page settings without pending changes", () => {
    const { saved } = saveFromEditor({ siteTitle: "Old title", sitePages: STORED_SITE_PAGES }, renameSite);

    const { saved: savedAgain } = saveFromEditor(saved);

    expect(JSON.stringify(savedAgain)).toBe(JSON.stringify(saved));
  });
});
