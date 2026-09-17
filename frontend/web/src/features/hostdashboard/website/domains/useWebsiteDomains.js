import { useCallback, useEffect, useState } from "react";
import { fetchWebsiteSiteByPropertyId } from "../services/websiteSiteService";
import {
  connectWebsiteDomain,
  fetchWebsiteDomains,
  promoteWebsiteDomain,
  removeWebsiteDomain,
  verifyWebsiteDomain,
} from "../services/websiteDomainService";
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
const ACTION_REMOVE = "remove";
const ACTION_PROMOTE = "promote";
const ERROR_SCOPE_FIELD = "field";
const ERROR_SCOPE_PANEL = "panel";
const RELOAD_ON_ERROR_CODES = new Set(["domain_limit_reached", "domain_not_found", "domains_unavailable"]);

const isCustomDomain = (entry) => entry?.domainType === DOMAIN_TYPE_CUSTOM;

const replaceCustomDomain = (domains, customDomain) => [
  ...domains.filter((entry) => !isCustomDomain(entry)),
  ...(customDomain ? [customDomain] : []),
];

const replaceAllDomains = (domains, nextDomains) => nextDomains;

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
        return true;
      }
      setSiteId(site.id);
      setDomains(await fetchWebsiteDomains(site.id));
      setStatus(WEBSITE_DOMAINS_STATUS.READY);
      return true;
    } catch (error) {
      setNotice(resolveDomainErrorCopy(error));
      setStatus(WEBSITE_DOMAINS_STATUS.ERROR);
      return false;
    }
  }, [propertyId]);

  useEffect(() => {
    setStatus(WEBSITE_DOMAINS_STATUS.IDLE);
    setSiteId("");
    setDomains([]);
    setNotice(null);
    setFieldError("");
  }, [propertyId]);

  useEffect(() => {
    if (enabled && status === WEBSITE_DOMAINS_STATUS.IDLE) {
      void load();
    }
  }, [enabled, load, status]);

  const runDomainAction = useCallback(
    async ({ action, request, errorScope = ERROR_SCOPE_PANEL, apply = replaceAllDomains }) => {
      setPendingAction(action);
      setNotice(null);
      setFieldError("");
      try {
        const result = await request();
        setDomains((current) => apply(current, result));
        return true;
      } catch (error) {
        const presentation = resolveDomainErrorCopy(error);
        const shouldReload = RELOAD_ON_ERROR_CODES.has(String(error?.code || ""));
        if (shouldReload && !(await load())) {
          return false;
        }
        const showInField =
          presentation.scope === ERROR_SCOPE_FIELD && errorScope === ERROR_SCOPE_FIELD && !shouldReload;
        if (showInField) {
          setFieldError(presentation.message);
        } else {
          setNotice(presentation);
        }
        return false;
      } finally {
        setPendingAction(null);
      }
    },
    [load]
  );

  const connect = useCallback(
    (value) => {
      const { domain, error } = validateCustomDomainInput(value);
      if (error) {
        setFieldError(error);
        return Promise.resolve(false);
      }
      return runDomainAction({
        action: ACTION_CONNECT,
        request: () => connectWebsiteDomain({ siteId, domain }),
        errorScope: ERROR_SCOPE_FIELD,
        apply: replaceCustomDomain,
      });
    },
    [runDomainAction, siteId]
  );

  const checkAgain = useCallback(
    () => runDomainAction({ action: ACTION_CHECK, request: () => verifyWebsiteDomain(siteId) }),
    [runDomainAction, siteId]
  );

  const remove = useCallback(
    (domain) => runDomainAction({ action: ACTION_REMOVE, request: () => removeWebsiteDomain({ siteId, domain }) }),
    [runDomainAction, siteId]
  );

  const promote = useCallback(
    (domain) => runDomainAction({ action: ACTION_PROMOTE, request: () => promoteWebsiteDomain({ siteId, domain }) }),
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
    isRemoving: pendingAction === ACTION_REMOVE,
    isPromoting: pendingAction === ACTION_PROMOTE,
    connect,
    checkAgain,
    remove,
    promote,
    reload: load,
  };
};
