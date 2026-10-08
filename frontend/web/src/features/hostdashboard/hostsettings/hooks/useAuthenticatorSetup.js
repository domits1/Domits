import { useRef, useState } from "react";
import { Auth } from "aws-amplify";
import QRCode from "qrcode";

const ISSUER = "Domits";
const CODE_PATTERN = /^\d{6}$/;

const ERROR_KEYS_BY_CODE = {
  EnableSoftwareTokenMFAException: "invalidCode",
  CodeMismatchException: "invalidCode",
  NotAuthorizedException: "sessionExpired",
  LimitExceededException: "tooManyAttempts",
  TooManyRequestsException: "tooManyAttempts",
};

const AMPLIFY_NOT_AUTHENTICATED = "The user is not authenticated";

const getErrorCode = (error) => error?.code ?? error?.name;

const toErrorKey = (error) => ERROR_KEYS_BY_CODE[getErrorCode(error)] ?? "generic";

const isSessionExpired = (error) =>
  error === AMPLIFY_NOT_AUTHENTICATED || getErrorCode(error) === "NotAuthorizedException";

const buildOtpauthUri = (accountName, secret) =>
  `otpauth://totp/${ISSUER}:${encodeURIComponent(accountName)}?secret=${encodeURIComponent(secret)}&issuer=${ISSUER}`;

export default function useAuthenticatorSetup({ onStatusChange }) {
  const [step, setStep] = useState("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
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

  const clearSecret = () => {
    setSecretKey("");
    setQrCodeUrl("");
  };

  const finishSetup = () => {
    clearSecret();
    setErrorKey(null);
    setStep("done");
  };

  const resetToIdle = (nextErrorKey) => {
    clearSecret();
    setErrorKey(nextErrorKey);
    setStep("idle");
  };

  const loadCurrentUser = async () => {
    try {
      return await Auth.currentAuthenticatedUser();
    } catch (error) {
      if (isSessionExpired(error)) {
        resetToIdle("sessionExpired");
      } else {
        setErrorKey("generic");
      }
      return null;
    }
  };

  const enableTotp = async (user) => {
    try {
      await Auth.setPreferredMFA(user, "TOTP");
    } catch (error) {
      if (isSessionExpired(error)) {
        resetToIdle("sessionExpired");
        return;
      }
      setErrorKey("enableFailed");
      setStep("enablePending");
      return;
    }

    try {
      await onStatusChange();
    } finally {
      finishSetup();
    }
  };

  const startSetup = () =>
    runExclusive(async () => {
      setErrorKey(null);
      try {
        const user = await Auth.currentAuthenticatedUser();
        const secret = await Auth.setupTOTP(user);
        const accountName = user.attributes?.email ?? user.username;
        const qrCode = await QRCode.toDataURL(buildOtpauthUri(accountName, secret));
        setSecretKey(secret);
        setQrCodeUrl(qrCode);
        setStep("setup");
      } catch (error) {
        setErrorKey(isSessionExpired(error) ? "sessionExpired" : toErrorKey(error));
      }
    });

  const verifySetup = (code) => {
    if (!CODE_PATTERN.test(code)) {
      setErrorKey("invalidCode");
      return Promise.resolve();
    }

    return runExclusive(async () => {
      setErrorKey(null);
      const user = await loadCurrentUser();
      if (!user) {
        return;
      }

      let verification;
      try {
        verification = await Auth.verifyTotpToken(user, code);
      } catch (error) {
        setErrorKey(toErrorKey(error));
        return;
      }

      if (verification?.Status !== "SUCCESS") {
        setErrorKey("invalidCode");
        return;
      }

      await enableTotp(user);
    });
  };

  const retryEnable = () =>
    runExclusive(async () => {
      setErrorKey(null);
      const user = await loadCurrentUser();
      if (!user) {
        return;
      }

      await enableTotp(user);
    });

  const cancelSetup = () => {
    if (isSubmittingRef.current) {
      return;
    }

    resetToIdle(null);
  };

  return {
    step,
    qrCodeUrl,
    secretKey,
    isSubmitting,
    errorKey,
    startSetup,
    verifySetup,
    retryEnable,
    cancelSetup,
  };
}
