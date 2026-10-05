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
};

const getErrorCode = (error) => error?.code ?? error?.name;

const toErrorKey = (error) => ERROR_KEYS_BY_CODE[getErrorCode(error)] ?? "generic";

const buildOtpauthUri = (accountName, secret) =>
  `otpauth://totp/${ISSUER}:${encodeURIComponent(accountName)}?secret=${encodeURIComponent(secret)}&issuer=${ISSUER}`;

export default function useAuthenticatorSetup({ onStatusChange }) {
  const [step, setStep] = useState("idle");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const userRef = useRef(null);
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
    userRef.current = null;
  };

  const resetToIdle = (nextErrorKey) => {
    clearSecret();
    setErrorKey(nextErrorKey);
    setStep("idle");
    userRef.current = null;
  };

  const enableTotp = async (user) => {
    try {
      await Auth.setPreferredMFA(user, "TOTP");
    } catch (error) {
      if (getErrorCode(error) === "NotAuthorizedException") {
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
        userRef.current = user;
        setSecretKey(secret);
        setQrCodeUrl(qrCode);
        setStep("setup");
      } catch (error) {
        setErrorKey(toErrorKey(error));
      }
    });

  const verifySetup = (code) => {
    if (!CODE_PATTERN.test(code)) {
      setErrorKey("invalidCode");
      return Promise.resolve();
    }

    return runExclusive(async () => {
      const user = userRef.current;
      setErrorKey(null);
      try {
        await Auth.verifyTotpToken(user, code);
      } catch (error) {
        setErrorKey(toErrorKey(error));
        return;
      }

      await enableTotp(user);
    });
  };

  const retryEnable = () =>
    runExclusive(async () => {
      const user = userRef.current;
      setErrorKey(null);
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
