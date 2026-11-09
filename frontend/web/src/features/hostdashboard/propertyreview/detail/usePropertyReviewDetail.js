import { useCallback, useEffect, useState } from "react";
import { fetchReviewDetail } from "../services/propertyReviewApi";

const UNSETTLED = Object.freeze({ propertyId: null, detail: null, error: null });

function usePropertyReviewDetail(propertyId) {
  const [result, setResult] = useState(UNSETTLED);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    fetchReviewDetail(propertyId, { signal })
      .then((detail) => {
        if (!signal.aborted) setResult({ propertyId, detail, error: null });
      })
      .catch((error) => {
        if (!signal.aborted) setResult({ propertyId, detail: null, error });
      });

    return () => controller.abort();
  }, [propertyId, attempt]);

  const retry = useCallback(() => {
    setResult(UNSETTLED);
    setAttempt((current) => current + 1);
  }, []);

  const settled = result.propertyId === propertyId;
  return {
    detail: settled ? result.detail : null,
    error: settled ? result.error : null,
    loading: !settled,
    retry,
  };
}

export default usePropertyReviewDetail;
