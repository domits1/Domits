// Desc: OnboardingButton component for onboarding

import { useNavigate } from 'react-router-dom';

export default function OnboardingButton({ btnText, onClick, routePath, buttonType = 'proceed' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    let shouldNavigate = true;
    if (onClick) {
      const result = onClick();
      if (result === false) shouldNavigate = false;
    }
    if (routePath && shouldNavigate) navigate(routePath);
  };

  const buttonClass = `onboarding-button ${buttonType}-button`;

  return (
    <button onClick={handleClick} className={buttonClass}>
      {btnText}
    </button>
  );
}
