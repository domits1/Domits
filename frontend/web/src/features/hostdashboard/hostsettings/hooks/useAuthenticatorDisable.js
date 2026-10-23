import { useState } from "react";
import { Auth } from "aws-amplify";
import { isSessionExpired, toErrorKey, useExclusiveSubmit } from "./authenticatorErrors";

export default function useAuthenticatorDisable({ onStatusChange }) {
  const [step, setStep] = useState("idle");
  const [errorKey, setErrorKey] = useState(null);
  const { isSubmitting, isBusy, runExclusive } = useExclusiveSubmit();

  const requestDisable = () => {
    setErrorKey(null);
    setStep("confirm");
  };

  const confirmDisable = () =>
    runExclusive(async () => {
      setErrorKey(null);
      try {
        const user = await Auth.currentAuthenticatedUser();
        await Auth.setPreferredMFA(user, "NOMFA");
      } catch (error) {
        if (isSessionExpired(error)) {
          setErrorKey("sessionExpired");
          setStep("idle");
          return;
        }
        setErrorKey(toErrorKey(error));
        return;
      }

      try {
        await onStatusChange();
      } finally {
        setStep("done");
      }
    });

  const cancelDisable = () => {
    if (isBusy()) {
      return;
    }

    setErrorKey(null);
    setStep("idle");
  };

  return {
    step,
    isSubmitting,
    errorKey,
    requestDisable,
    confirmDisable,
    cancelDisable,
  };
}
