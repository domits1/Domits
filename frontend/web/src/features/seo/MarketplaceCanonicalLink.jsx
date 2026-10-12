import { useLocation } from "react-router-dom";

import { resolveMarketplaceCanonicalUrl } from "./marketplaceCanonical";
import { useCanonicalLink } from "./ownedHeadTags";

const MarketplaceCanonicalLink = () => {
  const { pathname, search } = useLocation();
  const canonicalUrl = resolveMarketplaceCanonicalUrl({
    hostname: globalThis.location?.hostname || "",
    pathname,
    search,
  });

  useCanonicalLink(canonicalUrl);

  return null;
};

export default MarketplaceCanonicalLink;
