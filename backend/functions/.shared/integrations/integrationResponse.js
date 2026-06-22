export const shapeCredentialIntegrationForResponse = (integration) => {
  if (!integration || typeof integration !== "object") {
    return integration;
  }

  const { credentialsRef, ...safeIntegration } = integration;
  return safeIntegration;
};
