import { buildWebsiteTemplateModel } from "../../rendering/buildWebsiteTemplateModel";
import { applyWebsiteDraftContentOverrides } from "../../rendering/websiteDraftContentOverrides";
import { canRenderStaticSiteContent, renderStaticSiteContent } from "../renderStaticSiteContent";
import { buildPublishedSiteRenderPayload } from "./publishedSiteRenderPayload";

const buildModelFor = (payloadOverrides = {}) => {
  const renderPayload = buildPublishedSiteRenderPayload(payloadOverrides);
  const baseModel = buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });
  return applyWebsiteDraftContentOverrides(
    baseModel,
    renderPayload.contentOverrides,
    renderPayload.site.templateKey
  );
};

const PANORAMA = "panorama-landing";

const renderContentFor = (payloadOverrides = {}) =>
  renderStaticSiteContent({
    model: buildModelFor(payloadOverrides),
    title: "Wellness Villa Bisous | Ubud, Indonesia",
    templateKey: PANORAMA,
  });

const stripTags = (html) => html.replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, " ").trim();

describe("static site content for a crawler without JavaScript", () => {
  it("puts the listing name in the only h1", () => {
    const html = renderContentFor();

    expect(html.match(/<h1>/g)).toHaveLength(1);
    expect(html).toContain("<h1>Wellness Villa Bisous</h1>");
  });

  it("shows the description, the location and the amenities as readable text", () => {
    const text = stripTags(renderContentFor());

    expect(text).toContain("Escape to a serene four-bedroom private villa");
    expect(text).toContain("Ubud, Indonesia");
    expect(text).toContain("Freezer");
    expect(text).toContain("Oven");
    expect(text).toContain("8 Guests");
    expect(text).toContain("4 Bedrooms");
  });

  it("leaves the nightly rate out, because a snapshot cannot keep a price current", () => {
    const text = stripTags(renderContentFor());

    expect(text).not.toContain("550");
    expect(text).not.toContain("Base rate");
    expect(text).toContain("2 night minimum");
  });

  it("never exposes the street, house number or postal code", () => {
    const html = renderContentFor();

    expect(html).not.toContain("Jalan Raya Sayan");
    expect(html).not.toContain("80571");
  });

  it("gives every photo an alt text and keeps the placeholder out", () => {
    const html = renderContentFor();
    const imageTags = html.match(/<img[^>]*>/g) || [];

    expect(imageTags).toHaveLength(3);
    imageTags.forEach((imageTag) => {
      expect(imageTag).toMatch(/alt="[^"]+"/);
      expect(imageTag).toMatch(/src="https:\/\//);
      expect(imageTag).not.toContain("data:image");
    });
  });

  it("renders no photos at all rather than the placeholder", () => {
    const html = renderContentFor({ propertySnapshot: { images: [] } });

    expect(html).not.toContain("<img");
    expect(html).not.toContain("data:image");
  });

  it("escapes listing text so a title cannot inject markup", () => {
    const renderPayload = buildPublishedSiteRenderPayload({
      propertySnapshot: { property: { title: '<script>alert("x")</script>', description: "Safe & sound" } },
    });
    const model = buildWebsiteTemplateModel({ propertyDetails: renderPayload.propertySnapshot });
    const html = renderStaticSiteContent({ model, title: model.site.title, templateKey: PANORAMA });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Safe &amp; sound");
  });

  it("hides the sections a host switched off, like the live page does", () => {
    const html = renderContentFor({
      contentOverrides: {
        visibility: { amenitiesPanel: false, gallerySection: false, contactSection: false, trustCards: false },
      },
    });

    expect(html).not.toContain("Freezer");
    expect(html).not.toContain("Your host");
    expect(html).not.toContain("House rules");
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).not.toContain("second/web.jpg");
    expect(html).toContain("<h1>");
    expect(html).toContain("Location");
  });

  it("uses the heading a host wrote for the hero instead of the listing title", () => {
    const html = renderStaticSiteContent({
      model: buildModelFor({ contentOverrides: { heroTitle: "Your private villa in the rice fields" } }),
      title: "Wellness Villa Bisous | Ubud, Indonesia",
      templateKey: PANORAMA,
    });

    expect(html).toContain("<h1>Your private villa in the rice fields</h1>");
    expect(html).toContain('alt="Wellness Villa Bisous | Ubud, Indonesia"');
  });

  it("does not put the model placeholder in the heading when the listing has no title", () => {
    const html = renderStaticSiteContent({
      model: buildModelFor({ propertySnapshot: { property: {}, location: {}, images: [] }, contentOverrides: {} }),
      title: "Wellness Villa Bisous",
      templateKey: PANORAMA,
    });

    expect(html).toContain("<h1>Wellness Villa Bisous</h1>");
    expect(html).not.toContain("Untitled listing");
  });

  it("shows the check-in and check-out times, which do not go stale", () => {
    const text = stripTags(renderContentFor());

    expect(text).toContain("Check-in from 15:00");
    expect(text).toContain("Check-out until 11:00");
  });

  it("refuses to render a page without a title", () => {
    const model = buildWebsiteTemplateModel({ propertyDetails: {} });

    expect(() =>
      renderStaticSiteContent({ model: { ...model, site: { ...model.site, title: "" } }, title: "", templateKey: PANORAMA })
    ).toThrow(TypeError);
  });
});

describe("which templates the static page may mirror", () => {
  it("mirrors the panorama template, which is the one it was built against", () => {
    expect(canRenderStaticSiteContent("panorama-landing")).toBe(true);
  });

  it("refuses the templates whose sections it does not mirror", () => {
    ["experience-journey", "trust-signals", "", undefined, null, "panorama", "PANORAMA-LANDING", 42].forEach((key) => {
      expect(canRenderStaticSiteContent(key)).toBe(false);
      expect(() =>
        renderStaticSiteContent({ model: buildModelFor(), title: "Villa", templateKey: key })
      ).toThrow(/Cannot mirror template/);
    });
  });

  it("refuses when it is called with nothing at all", () => {
    [undefined, null].forEach((input) => {
      expect(() => renderStaticSiteContent(input)).toThrow(/Cannot mirror template/);
    });
  });
});

describe("what happens when the model is malformed", () => {
  const renderWith = (model) =>
    renderStaticSiteContent({ model, title: "Villa Aura", templateKey: "panorama-landing" });

  it("does not crash when every list is the wrong type", () => {
    const html = renderWith({
      site: { title: "Villa Aura" },
      stay: { stats: "nope" },
      amenities: { all: 42 },
      policies: { all: { nope: true } },
      media: { galleryImages: "nope", heroImage: null },
      location: {},
      hero: {},
    });

    expect(html).toContain("<h1>Villa Aura</h1>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
  });

  it("still refuses an empty model when no title comes with it", () => {
    expect(() =>
      renderStaticSiteContent({ model: {}, title: "", templateKey: "panorama-landing" })
    ).toThrow(/without a title/);
    expect(renderWith({ site: { title: "Villa" } })).toContain("<h1>Villa Aura</h1>");
  });
});
