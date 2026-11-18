import { useCallback, useEffect, useRef, useState } from "react";
import { requestPublicWebsiteQuotes } from "../../services/websitePublicQuoteService";

export const SITE_PROPERTY_SEARCH_STATUS = Object.freeze({ LOADING: "loading", DONE: "done", FAILED: "failed" });

const IDLE_SEARCH = Object.freeze({ status: "idle", criteria: null, answers: null, error: null });

export const useSitePropertySearch = ({ siteId, propertyIds, sessionId }) => {
  const [search, setSearch] = useState(IDLE_SEARCH);
  const pendingRequestRef = useRef(null);

  const dropPendingRequest = useCallback(() => {
    pendingRequestRef.current?.controller.abort();
    pendingRequestRef.current = null;
  }, []);

  const runSearch = useCallback(
    async (criteria) => {
      const key = JSON.stringify(criteria);
      if (pendingRequestRef.current?.key === key) {
        return;
      }
      dropPendingRequest();
      const request = { key, controller: new AbortController() };
      pendingRequestRef.current = request;
      setSearch({ ...IDLE_SEARCH, status: SITE_PROPERTY_SEARCH_STATUS.LOADING, criteria });

      let nextSearch;
      try {
        const signal = request.controller.signal;
        const answers = await requestPublicWebsiteQuotes({ siteId, propertyIds, ...criteria, sessionId, signal });
        nextSearch = { status: SITE_PROPERTY_SEARCH_STATUS.DONE, criteria, answers, error: null };
      } catch (error) {
        nextSearch = { status: SITE_PROPERTY_SEARCH_STATUS.FAILED, criteria, answers: null, error };
      }
      if (pendingRequestRef.current === request) {
        pendingRequestRef.current = null;
        setSearch(nextSearch);
      }
    },
    [dropPendingRequest, propertyIds, sessionId, siteId]
  );

  const clearSearch = useCallback(() => {
    dropPendingRequest();
    setSearch(IDLE_SEARCH);
  }, [dropPendingRequest]);

  useEffect(() => dropPendingRequest, [dropPendingRequest]);

  return { ...search, runSearch, clearSearch };
};
