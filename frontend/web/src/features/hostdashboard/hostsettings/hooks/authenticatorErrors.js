import { useRef, useState } from "react";

const AMPLIFY_NOT_AUTHENTICATED = "The user is not authenticated";

const SHARED_ERROR_KEYS_BY_CODE = {
  NotAuthorizedException: "sessionExpired",
  LimitExceededException: "tooManyAttempts",
  TooManyRequestsException: "tooManyAttempts",
};

export const getErrorCode = (error) => error?.code ?? error?.name;

export const isSessionExpired = (error) =>
  error === AMPLIFY_NOT_AUTHENTICATED || getErrorCode(error) === "NotAuthorizedException";

export const toErrorKey = (error, errorKeysByCode = {}) => {
  const code = getErrorCode(error);
  return errorKeysByCode[code] ?? SHARED_ERROR_KEYS_BY_CODE[code] ?? "generic";
};

export function useExclusiveSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const runExclusive = async (action) => {
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      await action();
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isBusy = () => isSubmittingRef.current;

  return { isSubmitting, isBusy, runExclusive };
}
