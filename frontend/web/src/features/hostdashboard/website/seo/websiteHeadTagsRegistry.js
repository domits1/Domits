let activeWebsitePublicSitePageCount = 0;

export const registerWebsitePublicSitePage = () => {
  activeWebsitePublicSitePageCount += 1;
  let hasReleased = false;

  return () => {
    if (hasReleased) {
      return;
    }

    hasReleased = true;
    activeWebsitePublicSitePageCount = Math.max(0, activeWebsitePublicSitePageCount - 1);
  };
};

export const isWebsitePublicSitePageActive = () => activeWebsitePublicSitePageCount > 0;
