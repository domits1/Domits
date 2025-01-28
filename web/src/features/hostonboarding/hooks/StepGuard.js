import { Navigate, useLocation } from "react-router-dom";
import useFormStore from "../stores/formStore";

function StepGuard({ children, step }) {
    const completedSteps = useFormStore((state) => state.completedSteps);
    const location = useLocation();

    if (!completedSteps.includes(step)) {
        return <Navigate to="/hostonboarding" state={{ from: location }} />;
    }

    return children;
}

export default StepGuard