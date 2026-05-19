import { Auth } from "aws-amplify";
import { toast } from "react-toastify";

export const HOST_ONBOARDING_PATH = "/hostonboarding";
const HOST_ONBOARDING_REDIRECT = encodeURIComponent(HOST_ONBOARDING_PATH);

export const getHostRegisterPath = () =>
  `/register?redirect=${HOST_ONBOARDING_REDIRECT}`;

export const getHostLoginPath = () =>
  `/login?redirect=${HOST_ONBOARDING_REDIRECT}`;

export const startHostingFlow = async ({
  isAuthenticated,
  group,
  navigate,
  setFlowState,
  unauthenticatedPath = getHostRegisterPath(),
}) => {
  try {
    if (!isAuthenticated) {
      if (typeof setFlowState === "function") {
        setFlowState({ isHost: true });
      }

      navigate(unauthenticatedPath);
      return;
    }

    if (group !== "Host") {
      const user = await Auth.currentAuthenticatedUser();

      await Auth.updateUserAttributes(user, {
        "custom:group": "Host",
      });
    }

    navigate(HOST_ONBOARDING_PATH);
  } catch (error) {
    toast.error(
      error?.message ||
        "We could not start hosting right now. Please try again."
    );
  }
};
