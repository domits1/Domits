// Desc: OnboardingButton component for onboarding

import { useNavigate } from 'react-router-dom';

export default function OnboardingButton({ btnText, onClick, routePath, buttonType = 'proceed' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    if (routePath) navigate(routePath);
  };

  const buttonClass = `onboarding-button ${buttonType}-button`;

  return (
    <button onClick={handleClick} className={buttonClass}>
      {btnText}
    </button>
  );
}
