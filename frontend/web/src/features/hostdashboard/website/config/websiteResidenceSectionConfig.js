import {
  DEFAULT_WEBSITE_SECTION_PANEL_COLOR,
  resolveWebsiteSectionPanelColor,
} from "./websiteSectionPanelConfig";

export const DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR = DEFAULT_WEBSITE_SECTION_PANEL_COLOR;

export const resolveWebsiteResidencePanelColor = (value) =>
  resolveWebsiteSectionPanelColor(value, DEFAULT_WEBSITE_RESIDENCE_PANEL_COLOR);
