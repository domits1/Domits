import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import DigitInputs from "../../../components/ui/DigitsInputs/DigitsInputs";

const CODE_LENGTH = 6;
const CODE_PATTERN = /^\d{6}$/;

const MfaChallengeStep = ({ onVerify, onCancel, isVerifying, errorMessage = "" }) => {
  const inputRef = useRef([]);
  const [isComplete, setIsComplete] = useState(false);
  const wasVerifyingRef = useRef(false);

  useEffect(() => {
    const finishedWithError = wasVerifyingRef.current && !isVerifying && Boolean(errorMessage);
    wasVerifyingRef.current = isVerifying;

    if (!finishedWithError) {
      return;
    }

    inputRef.current.forEach((input) => {
      if (input) {
        input.value = "";
      }
    });
    setIsComplete(false);
    inputRef.current[0]?.focus();
  }, [isVerifying, errorMessage]);

  const readCode = () => inputRef.current.map((input) => input?.value ?? "").join("");

  const submitCode = (code) => {
    if (CODE_PATTERN.test(code)) {
      onVerify(code);
    }
  };

  const handleComplete = (value) => {
    const isValidCode = typeof value === "string" && CODE_PATTERN.test(value);
    setIsComplete(isValidCode);
    if (isValidCode) {
      submitCode(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCode(readCode());
  };

  return (
    <>
      <h2 className="title">Two-factor authentication</h2>

      <p className="bottomText">Enter the 6-digit code from your authenticator app.</p>

      <form onSubmit={handleSubmit} aria-label="Authenticator code">
        <fieldset className="mfaChallengeFields" disabled={isVerifying}>
          <DigitInputs amount={CODE_LENGTH} inputRef={inputRef} onComplete={handleComplete} error={Boolean(errorMessage)} />

          {errorMessage && <div className="error">{errorMessage}</div>}

          <button type="submit" className="primaryBtn" disabled={isVerifying || !isComplete} aria-busy={isVerifying}>
            {isVerifying ? (
              <span className="buttonLoadingContent">
                <span className="buttonSpinner" aria-hidden="true"></span>
                <span>Verifying...</span>
              </span>
            ) : (
              "Verify"
            )}
          </button>

          <button type="button" className="secondaryBtn" onClick={onCancel}>
            Back to login
          </button>
        </fieldset>
      </form>
    </>
  );
};

MfaChallengeStep.propTypes = {
  onVerify: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isVerifying: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
};

export default MfaChallengeStep;
