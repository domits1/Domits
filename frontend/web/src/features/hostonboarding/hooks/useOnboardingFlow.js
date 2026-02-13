import { useLocation } from "react-router-dom"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import {
  findStepIndex,
  getFlowKeyFromPath,
  normalizeOnboardingPath,
  ONBOARDING_FLOW_STEPS,
} from "../constants/onboardingFlow"

export const useOnboardingFlow = () => {
  const location = useLocation()
  const selectedType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  )

  const flowKey = getFlowKeyFromPath(location.pathname, selectedType)
  const steps = ONBOARDING_FLOW_STEPS[flowKey]
  const currentPath = normalizeOnboardingPath(location.pathname)
  const stepIndexRaw = findStepIndex(steps, currentPath, flowKey)
  const safeIndex = Math.max(0, stepIndexRaw)
  const totalSteps = steps.length
  const stepIndex = Math.min(safeIndex + 1, totalSteps)
  const prevPath = steps[safeIndex - 1]?.path || null
  const nextPath = steps[safeIndex + 1]?.path || null

  return {
    flowKey,
    steps,
    currentPath,
    stepIndex,
    totalSteps,
    prevPath,
    nextPath,
  }
}
