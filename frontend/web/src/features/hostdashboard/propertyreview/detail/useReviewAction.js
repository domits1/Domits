import { useCallback, useRef, useState } from "react";
import { REVIEW_API_ERROR_CODE } from "../services/propertyReviewApi";
import { describeActionError } from "./reviewDetailFormat";

function useReviewAction({ action, onSuccess, onStale, onWrongStatus }) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inFlight = useRef(false);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setErrorMessage("");

    let failed = false;
    let failure = null;
    try {
      await action();
    } catch (error) {
      failed = true;
      failure = error;
    }
    inFlight.current = false;
    setSubmitting(false);

    if (!failed) onSuccess();
    else if (failure?.code === REVIEW_API_ERROR_CODE.STALE_REVIEW) onStale();
    else if (failure?.code === REVIEW_API_ERROR_CODE.WRONG_STATUS) onWrongStatus();
    else setErrorMessage(describeActionError(failure));
  }, [action, onSuccess, onStale, onWrongStatus]);

  const clearError = useCallback(() => setErrorMessage(""), []);

  return { submit, submitting, errorMessage, clearError };
}

export default useReviewAction;
