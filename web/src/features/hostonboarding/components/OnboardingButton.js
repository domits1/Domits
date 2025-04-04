// Desc: OnboardingButton component for onboarding

import { useNavigate } from 'react-router-dom';

export default function OnboardingButton({ btnText, onClick, routePath }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    if (routePath) navigate(routePath);
  };

  return (
    <button onClick={handleClick} className="onboarding-button">
      {btnText}
    </button>
  );
}
