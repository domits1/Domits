import { fetchWebsitePropertyDetails } from "./websitePropertyService";
import { buildWebsiteTemplateModel } from "../rendering/buildWebsiteTemplateModel";

export const PREVIEW_STAGE = Object.freeze({
  idle: "idle",
  loading: "loading",
  ready: "ready",
  error: "error",
});

export const PREVIEW_BUILD_STEPS = Object.freeze([
  {
    key: "fetching",
    title: "Importing listing details",
    description: "Loading the selected Domits property from the dedicated detail endpoint.",
  },
  {
    key: "mapping",
    title: "Mapping content into template slots",
    description: "Connecting title, images, amenities, policies, and stay details to the shared website model.",
  },
  {
    key: "rendering",
    title: "Preparing the real preview",
    description: "Rendering the chosen template inside the dashboard preview stage.",
  },
]);

const waitForNextPaint = () =>
  new Promise((resolve) => {
    const scheduleFrame =
      typeof globalThis.requestAnimationFrame === "function"
        ? globalThis.requestAnimationFrame.bind(globalThis)
        : (callback) => globalThis.setTimeout(callback, 0);

    scheduleFrame(() => resolve());
  });

export const runWebsitePreviewBuildWorkflow = async ({
  propertyId,
  summaryProperty,
  onPhaseChange = () => {},
}) => {
  onPhaseChange(PREVIEW_BUILD_STEPS[0].key);
  const propertyDetails = await fetchWebsitePropertyDetails(propertyId);

  onPhaseChange(PREVIEW_BUILD_STEPS[1].key);
  await waitForNextPaint();

  const previewModel = buildWebsiteTemplateModel({
    propertyDetails,
    summaryProperty,
  });

  onPhaseChange(PREVIEW_BUILD_STEPS[2].key);
  await waitForNextPaint();

  return previewModel;
};
