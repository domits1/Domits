import {
  DEFAULT_WEBSITE_SECTION_PANEL_COLOR,
  resolveWebsiteSectionPanelColor,
} from "./websiteSectionPanelConfig";
export { normalizeWebsiteSectionPanelColorOverride as normalizeWebsiteGalleryPanelColorOverride } from "./websiteSectionPanelConfig";

export const DEFAULT_WEBSITE_GALLERY_PANEL_COLORS = Object.freeze({
  default: DEFAULT_WEBSITE_SECTION_PANEL_COLOR,
  "panorama-landing": DEFAULT_WEBSITE_SECTION_PANEL_COLOR,
});

export const getDefaultWebsiteGalleryPanelColor = (templateKey = "") =>
  DEFAULT_WEBSITE_GALLERY_PANEL_COLORS[String(templateKey || "").trim()] ||
  DEFAULT_WEBSITE_GALLERY_PANEL_COLORS.default;

export const resolveWebsiteGalleryPanelColor = (value, templateKey = "") =>
  resolveWebsiteSectionPanelColor(value, getDefaultWebsiteGalleryPanelColor(templateKey));
