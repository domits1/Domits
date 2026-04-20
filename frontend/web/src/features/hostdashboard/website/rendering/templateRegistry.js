import PanoramaLandingTemplate from "./templates/PanoramaLandingTemplate";
import TrustSignalsTemplate from "./templates/TrustSignalsTemplate";
import ExperienceJourneyTemplate from "./templates/ExperienceJourneyTemplate";

const IMPLEMENTED_TEMPLATES = Object.freeze({
  "panorama-landing": PanoramaLandingTemplate,
  "trust-signals": TrustSignalsTemplate,
  "experience-journey": ExperienceJourneyTemplate,
});

export const isWebsiteTemplateImplemented = (templateId) =>
  Object.hasOwn(IMPLEMENTED_TEMPLATES, String(templateId || ""));

export const getWebsiteTemplateRenderer = (templateId) =>
  IMPLEMENTED_TEMPLATES[String(templateId || "")] || null;
