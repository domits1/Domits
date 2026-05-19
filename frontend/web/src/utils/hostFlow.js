import { Auth } from "aws-amplify";

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
};
