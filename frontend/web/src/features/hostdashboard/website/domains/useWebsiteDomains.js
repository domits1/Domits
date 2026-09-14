import { useCallback, useEffect, useState } from "react";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import { connectWebsiteDomain, fetchWebsiteDomains, verifyWebsiteDomain } from "../services/websiteDomainService";
import { resolveDomainErrorCopy, validateCustomDomainInput } from "./websiteDomainTimeline";

export const WEBSITE_DOMAINS_STATUS = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  UNPUBLISHED: "unpublished",
  ERROR: "error",
});

const DOMAIN_TYPE_CUSTOM = "CUSTOM";
const SITE_STATUS_PUBLISHED = "PUBLISHED";
const ACTION_CONNECT = "connect";
const ACTION_CHECK = "check";

const isCustomDomain = (entry) => entry?.domainType === DOMAIN_TYPE_CUSTOM;

const replaceCustomDomain = (domains, customDomain) => [
  ...domains.filter((entry) => !isCustomDomain(entry)),
  ...(customDomain ? [customDomain] : []),
];

export const useWebsiteDomains = ({ propertyId, enabled }) => {
  const [status, setStatus] = useState(WEBSITE_DOMAINS_STATUS.IDLE);
  const [siteId, setSiteId] = useState("");
  const [domains, setDomains] = useState([]);
  const [notice, setNotice] = useState(null);
  const [fieldError, setFieldError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const load = useCallback(async () => {
    setStatus(WEBSITE_DOMAINS_STATUS.LOADING);
    setNotice(null);
    try {
      const summary = await fetchWebsiteSiteByPropertyId(propertyId);
      const site = summary?.site;
      if (!site?.id || site.status !== SITE_STATUS_PUBLISHED) {
        setStatus(WEBSITE_DOMAINS_STATUS.UNPUBLISHED);
        return;
      }
      setSiteId(site.id);
      setDomains(await fetchWebsiteDomains(site.id));
      setStatus(WEBSITE_DOMAINS_STATUS.READY);
    } catch (error) {
      setNotice(resolveDomainErrorCopy(error));
      setStatus(WEBSITE_DOMAINS_STATUS.ERROR);
    }
  }, [propertyId]);

  useEffect(() => {
    if (enabled && status === WEBSITE_DOMAINS_STATUS.IDLE) {
      void load();
    }
  }, [enabled, load, status]);

  const runDomainAction = useCallback(async (action, request) => {
    setPendingAction(action);
    setNotice(null);
    setFieldError("");
    try {
      const domain = await request();
      setDomains((current) => replaceCustomDomain(current, domain));
      return true;
    } catch (error) {
      const presentation = resolveDomainErrorCopy(error);
      if (presentation.scope === "field") {
        setFieldError(presentation.message);
      } else {
        setNotice(presentation);
      }
      return false;
    } finally {
      setPendingAction(null);
    }
  }, []);

  const connect = useCallback(
    (value) => {
      const { domain, error } = validateCustomDomainInput(value);
      if (error) {
        setFieldError(error);
        return Promise.resolve(false);
      }
      return runDomainAction(ACTION_CONNECT, () => connectWebsiteDomain({ siteId, domain }));
    },
    [runDomainAction, siteId]
  );

  const checkAgain = useCallback(
    () => runDomainAction(ACTION_CHECK, () => verifyWebsiteDomain(siteId)),
    [runDomainAction, siteId]
  );

  return {
    status,
    domains,
    customDomain: domains.find(isCustomDomain) || null,
    notice,
    fieldError,
    isConnecting: pendingAction === ACTION_CONNECT,
    isChecking: pendingAction === ACTION_CHECK,
    connect,
    checkAgain,
    reload: load,
  };
};
