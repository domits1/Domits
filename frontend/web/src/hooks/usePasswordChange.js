import { useContext, useState } from "react";
import { Auth } from "aws-amplify";
import { LanguageContext } from "../context/LanguageContext";
import en from "../content/en.json";
import nl from "../content/nl.json";
import de from "../content/de.json";
import es from "../content/es.json";

const contentByLanguage = { en, nl, de, es };
const MIN_PASSWORD_LENGTH = 8;

// Cognito's changePassword rejection carries a `code`, not a stable message —
// map the realistic ones to translated copy instead of showing AWS's raw wording.
const COGNITO_ERROR_MESSAGE_KEYS = {
  NotAuthorizedException: "currentPasswordIncorrect",
  InvalidPasswordException: "passwordPolicyViolation",
  LimitExceededException: "tooManyPasswordAttempts",
};

export default function usePasswordChange() {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.settings?.personalData?.prefs
    ?? contentByLanguage.en.settings.personalData.prefs;

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordChangeSuccess(false);
  };

  const onOpenPasswordChange = () => {
    resetPasswordForm();
    setIsChangingPassword(true);
  };

  const onClosePasswordChange = () => {
    resetPasswordForm();
    setIsChangingPassword(false);
  };

  const onCurrentPasswordChange = (e) => setCurrentPassword(e.target.value);
  const onNewPasswordChange = (e) => setNewPassword(e.target.value);
  const onConfirmPasswordChange = (e) => setConfirmPassword(e.target.value);

  const onSubmitPasswordChange = async () => {
    setPasswordError("");
    setPasswordChangeSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t.passwordFieldsRequired);
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(t.passwordTooShort.replace("{min}", MIN_PASSWORD_LENGTH));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }

    setIsSavingPassword(true);
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      await Auth.changePassword(cognitoUser, currentPassword, newPassword);
      setPasswordChangeSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const messageKey = COGNITO_ERROR_MESSAGE_KEYS[error?.code];
      setPasswordError(messageKey ? t[messageKey] : t.passwordChangeFailed);
    } finally {
      setIsSavingPassword(false);
    }
  };

  return {
    isChangingPassword,
    currentPassword,
    newPassword,
    confirmPassword,
    passwordError,
    isSavingPassword,
    passwordChangeSuccess,
    onOpenPasswordChange,
    onClosePasswordChange,
    onCurrentPasswordChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onSubmitPasswordChange,
  };
}
