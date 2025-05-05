// Button component for onboarding

import { useNavigate } from 'react-router-dom';

function Button({ btnText, onClick, routePath, disabled, className = '' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick(); // Let the onClick handler potentially call navigate()
    } else if (routePath) { // Only navigate via routePath if no onClick handles it
      navigate(routePath);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`onboarding-button ${className} ${disabled ? 'button-disabled' : ''}`}
      disabled={disabled}
    >
      {btnText}
    </button>
  );
}

export default Button;