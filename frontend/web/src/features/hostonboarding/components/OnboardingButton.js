// Desc: OnboardingButton component for onboarding

import { useNavigate } from "react-router-dom";

export default function OnboardingButton({
  btnText,
  onClick,
  routePath,
  buttonType = "proceed",
  disabled = false,
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    let shouldNavigate = true;
    if (onClick) {
      const result = onClick();
      if (result === false) shouldNavigate = false;
    }
    if (routePath && shouldNavigate) navigate(routePath);
  };

  const buttonClass = `onboarding-button ${buttonType}-button${
    disabled ? " is-disabled" : ""
  }`;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={buttonClass}
      disabled={disabled}
    >
      {btnText}
    </button>
  );
}
