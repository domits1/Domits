import PropTypes from "prop-types"
import { useOnboardingFlow } from "../hooks/useOnboardingFlow"

function OnboardingProgress({ step, total }) {
  const { stepIndex, totalSteps } = useOnboardingFlow()
  const resolvedTotal = total ?? totalSteps
  const resolvedStep = step ?? stepIndex
  const safeTotal = Number.isFinite(resolvedTotal) && resolvedTotal > 0 ? resolvedTotal : 1;
  const safeStep = Number.isFinite(resolvedStep) && resolvedStep > 0 ? Math.min(resolvedStep, safeTotal) : 1;
  const progressPercent = Math.round((safeStep / safeTotal) * 100);

  return (
    <div className="onboarding-progress" aria-hidden="true">
      <span className="onboarding-progress-step">Step {safeStep} of {safeTotal}</span>
      <div className="onboarding-progress-meter">
        <span className="onboarding-progress-meter-fill" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

export default OnboardingProgress;

OnboardingProgress.propTypes = {
  step: PropTypes.number,
  total: PropTypes.number,
};

OnboardingProgress.defaultProps = {
  step: null,
  total: null,
};
