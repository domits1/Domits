import {useRef, useState} from 'react';
import {confirmSignIn} from '@aws-amplify/auth';

const CODE_PATTERN = /^\d{6}$/;

const ERROR_KEYS_BY_NAME = {
  CodeMismatchException: 'invalidCode',
  ExpiredCodeException: 'invalidCode',
  LimitExceededException: 'tooManyAttempts',
  TooManyRequestsException: 'tooManyAttempts',
};

const SESSION_EXPIRED_ERRORS = new Set([
  'NotAuthorizedException',
  'SignInException',
]);

const useSignInChallenge = ({onSuccess, onSessionExpired}) => {
  const [isChallengePending, setIsChallengePending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState(null);
  const isSubmittingRef = useRef(false);

  const startChallenge = () => {
    setErrorKey(null);
    setIsChallengePending(true);
  };

  const cancelChallenge = () => {
    setErrorKey(null);
    setIsChallengePending(false);
  };

  const handleVerifyError = error => {
    const errorName = error?.name;
    if (SESSION_EXPIRED_ERRORS.has(errorName)) {
      cancelChallenge();
      onSessionExpired();
      return;
    }
    setErrorKey(ERROR_KEYS_BY_NAME[errorName] ?? 'generic');
  };

  const verifyCode = async code => {
    if (!CODE_PATTERN.test(code)) {
      setErrorKey('invalidCode');
      return;
    }
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrorKey(null);
    try {
      const result = await confirmSignIn({challengeResponse: code});
      if (!result?.isSignedIn) {
        setErrorKey('generic');
        return;
      }
      await onSuccess();
      setIsChallengePending(false);
    } catch (error) {
      handleVerifyError(error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    isChallengePending,
    isSubmitting,
    errorKey,
    startChallenge,
    cancelChallenge,
    verifyCode,
  };
};

export default useSignInChallenge;
