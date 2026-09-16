import { useState } from "react";
import { Auth } from "aws-amplify";

const MIN_PASSWORD_LENGTH = 8;

export default function usePasswordChange() {
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
      setPasswordError("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
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
      setPasswordError(error?.message || "Failed to change password. Please try again.");
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
