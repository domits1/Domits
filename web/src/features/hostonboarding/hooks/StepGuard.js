import { Navigate, useLocation } from "react-router-dom"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

function StepGuard({ children, step }) {
  const completedSteps = useFormStoreHostOnboarding(
    (state) => state.completedSteps,
  )
  const location = useLocation()

  if (!completedSteps.includes(step)) {
    return <Navigate to="/hostonboarding" state={{ from: location }} />
  }

  return children
}

export default StepGuard
