import { useCallback, useEffect, useState } from "react";
import { fetchReviewDetail } from "../services/propertyReviewApi";

const UNSETTLED = Object.freeze({ propertyId: null, detail: null, error: null });

function usePropertyReviewDetail(propertyId) {
  const [result, setResult] = useState(UNSETTLED);
  const [attempt, setAttempt] = useState(0);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    void fetchReviewDetail(propertyId, { signal })
      .then((detail) => {
        if (signal.aborted) return;
        setResult({ propertyId, detail, error: null });
        setReloading(false);
      })
      .catch((error) => {
        if (signal.aborted) return;
        setResult({ propertyId, detail: null, error });
        setReloading(false);
      });

    return () => controller.abort();
  }, [propertyId, attempt]);

  const retry = useCallback(() => {
    setResult(UNSETTLED);
    setAttempt((current) => current + 1);
  }, []);

  const reload = useCallback(() => {
    setReloading(true);
    setAttempt((current) => current + 1);
  }, []);

  const settled = result.propertyId === propertyId;
  return {
    detail: settled ? result.detail : null,
    error: settled ? result.error : null,
    loading: !settled,
    reloading,
    retry,
    reload,
  };
}

export default usePropertyReviewDetail;
