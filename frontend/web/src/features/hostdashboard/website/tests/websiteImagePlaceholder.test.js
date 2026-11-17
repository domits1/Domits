import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";
import { normalizeImageUrl, placeholderImage, S3_ACCOMMODATION_URL } from "../../../../utils/accommodationImage";

describe("the No image placeholder on a direct booking website", () => {
  it("gives a listing without photos a hero image that loads, not a bucket URL around the placeholder", () => {
    const model = buildWebsiteTemplateModel({ propertyDetails: { images: [] } });

    expect(model.media.heroImageAsset.src).toBe(placeholderImage);
    expect(model.media.heroImageAsset.originalSrc).toBe(placeholderImage);
  });

  it("still turns a stored image key into a bucket URL", () => {
    expect(normalizeImageUrl("images/property-1/web.webp")).toBe(`${S3_ACCOMMODATION_URL}images/property-1/web.webp`);
  });

  it("does not pass any other data URI through, not even an SVG that looks like the placeholder", () => {
    const lookalike = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg'><text>No image</text></svg>";

    expect(normalizeImageUrl(lookalike)).toBe(`${S3_ACCOMMODATION_URL}${lookalike}`);
  });
});
