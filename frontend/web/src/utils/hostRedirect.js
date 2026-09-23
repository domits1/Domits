import { Auth } from "aws-amplify";

// Resolves the user's group fresh via Amplify at call time instead of trusting mount-time
// context state, so a host clicking immediately after page load isn't routed to guestPath.
// Read-only: never mutates Cognito attributes.
export const navigateToHostDestination = async ({ navigate, hostPath = "/hostdashboard", guestPath = "/register" }) => {
  try {
    const user = await Auth.currentAuthenticatedUser();
    const group = user?.attributes?.["custom:group"];
    navigate(group === "Host" ? hostPath : guestPath);
  } catch {
    navigate(guestPath);
  }
};
