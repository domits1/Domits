import { useRef, useState } from "react";
import { Auth } from "aws-amplify";

export const SOFTWARE_TOKEN_MFA = "SOFTWARE_TOKEN_MFA";
const INVALID_CODE_MESSAGE = "Invalid code. Please try again.";
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const INVALID_CODE_ERRORS = new Set(["CodeMismatchException", "ExpiredCodeException"]);
const SESSION_EXPIRED_ERROR = "NotAuthorizedException";

const getErrorCode = (error) => error?.code ?? error?.name;

export function useMfaChallenge({ onSuccess, onSessionExpired }) {
  const [pendingUser, setPendingUser] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isVerifyingRef = useRef(false);

  const startChallenge = (user) => {
    setErrorMessage("");
    setPendingUser(user);
  };

  const cancelChallenge = () => {
    setErrorMessage("");
    setPendingUser(null);
  };

  const stopVerifying = () => {
    isVerifyingRef.current = false;
    setIsVerifying(false);
  };

  const handleVerifyError = (error) => {
    const errorCode = getErrorCode(error);

    if (errorCode === SESSION_EXPIRED_ERROR) {
      setPendingUser(null);
      onSessionExpired();
      return;
    }

    setErrorMessage(INVALID_CODE_ERRORS.has(errorCode) ? INVALID_CODE_MESSAGE : GENERIC_ERROR_MESSAGE);
  };

  const verifyCode = async (code) => {
    if (isVerifyingRef.current || !pendingUser) {
      return;
    }

    isVerifyingRef.current = true;
    setIsVerifying(true);
    setErrorMessage("");
    try {
      await Auth.confirmSignIn(pendingUser, code, SOFTWARE_TOKEN_MFA);
      onSuccess();
    } catch (error) {
      handleVerifyError(error);
      stopVerifying();
    }
  };

  return {
    pendingUser,
    startChallenge,
    verifyCode,
    cancelChallenge,
    isVerifying,
    errorMessage,
  };
}
