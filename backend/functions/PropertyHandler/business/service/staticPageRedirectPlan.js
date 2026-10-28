import { isStaticPageHostname } from "../../data/repository/staticPageStore.js";
import {
  isDirectBookingWebsiteCustomDomain,
  resolveDirectBookingWebsiteRuntimeDomainStatus,
  selectDirectBookingWebsiteMainAddress,
} from "../../util/directBookingWebsiteRouting.js";

const resolvePrimaryHostname = (site, domains) => {
  if (site?.status !== "PUBLISHED") {
    return "";
  }
  const mainAddress = selectDirectBookingWebsiteMainAddress(site, domains);
  return mainAddress && isDirectBookingWebsiteCustomDomain(mainAddress) && isStaticPageHostname(mainAddress.domain)
    ? mainAddress.domain
    : "";
};

export const planSiteRedirects = ({ site, domains = [] }) => {
  const hostnames = [...new Set(domains.map((domain) => domain?.domain).filter(isStaticPageHostname))];
  const primary = resolvePrimaryHostname(site, domains);
  const isRedirectedAlias = (domain) =>
    domain.domain !== primary &&
    isStaticPageHostname(domain.domain) &&
    resolveDirectBookingWebsiteRuntimeDomainStatus(site, domain) === "ACTIVE";
  const redirected = new Set(primary ? domains.filter(isRedirectedAlias).map((domain) => domain.domain) : []);

  return {
    puts: [...redirected].map((hostname) => ({ hostname, primary })),
    deletes: hostnames.filter((hostname) => !redirected.has(hostname)),
  };
};
