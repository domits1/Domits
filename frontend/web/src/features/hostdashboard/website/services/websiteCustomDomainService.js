import {
  buildAuthorizedWebsiteHostHeaders,
  buildWebsiteHostApiUrl,
  getWebsiteHostApiErrorMessage,
} from "./websiteHostApi";
import { normalizeWebsiteSiteSummary } from "./websiteSiteSummary";

const buildWebsiteCustomDomainRequestUrl = () => buildWebsiteHostApiUrl("/website/site/domain/custom");
const buildWebsiteCustomDomainRecheckUrl = () =>
  buildWebsiteHostApiUrl("/website/site/domain/custom/recheck");
const buildWebsiteCustomDomainActivateUrl = () =>
  buildWebsiteHostApiUrl("/website/site/domain/custom/activate");
const buildWebsiteCustomDomainDeactivateUrl = () =>
  buildWebsiteHostApiUrl("/website/site/domain/custom/deactivate");

const buildWebsiteDomainMutationBody = (propertyId) => ({
  propertyId: String(propertyId || "").trim(),
});

export const requestWebsiteCustomDomain = async ({ propertyId, domain }) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for custom domain setup.");
  }

  const normalizedDomain = String(domain || "").trim();
  if (!normalizedDomain) {
    throw new Error("Custom domain is required.");
  }

  const response = await fetch(buildWebsiteCustomDomainRequestUrl(), {
    method: "POST",
    cache: "no-store",
    headers: buildAuthorizedWebsiteHostHeaders({
      contentType: "application/json",
      unauthorizedMessage: "You must be signed in to manage website domains.",
    }),
    body: JSON.stringify({
      propertyId: normalizedPropertyId,
      domain: normalizedDomain,
    }),
  });

  if (!response.ok) {
    const errorMessage = await getWebsiteHostApiErrorMessage(
      response,
      "We could not save this custom domain request."
    );
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};

const runWebsiteCustomDomainMutation = async ({
  url,
  propertyId,
  fallbackMessage,
}) => {
  const normalizedPropertyId = String(propertyId || "").trim();
  if (!normalizedPropertyId) {
    throw new Error("Missing propertyId for custom domain setup.");
  }

  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: buildAuthorizedWebsiteHostHeaders({
      contentType: "application/json",
      unauthorizedMessage: "You must be signed in to manage website domains.",
    }),
    body: JSON.stringify(buildWebsiteDomainMutationBody(normalizedPropertyId)),
  });

  if (!response.ok) {
    const errorMessage = await getWebsiteHostApiErrorMessage(response, fallbackMessage);
    throw new Error(errorMessage);
  }

  return normalizeWebsiteSiteSummary(await response.json());
};

export const recheckWebsiteCustomDomain = async (propertyId) =>
  runWebsiteCustomDomainMutation({
    url: buildWebsiteCustomDomainRecheckUrl(),
    propertyId,
    fallbackMessage: "We could not recheck this custom domain yet.",
  });

export const activateWebsiteCustomDomain = async (propertyId) =>
  runWebsiteCustomDomainMutation({
    url: buildWebsiteCustomDomainActivateUrl(),
    propertyId,
    fallbackMessage: "We could not activate this custom domain.",
  });

export const deactivateWebsiteCustomDomain = async (propertyId) =>
  runWebsiteCustomDomainMutation({
    url: buildWebsiteCustomDomainDeactivateUrl(),
    propertyId,
    fallbackMessage: "We could not deactivate this custom domain.",
  });
