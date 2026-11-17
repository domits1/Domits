export const toPublicWebsiteSiteView = (site) => {
  if (!site) {
    return null;
  }

  return {
    id: site.id,
    siteName: site.siteName,
    primaryLocale: site.primaryLocale,
    status: site.status,
    templateKey: site.templateKey,
  };
};
