import { Auth } from "aws-amplify";

export const handlePostLogin = async ({
  email,
  setErrorMessage,
  cleanup = () => {},
}) => {
  const currentUser = await Auth.currentAuthenticatedUser({
    bypassCache: true,
  });

  const attrs = currentUser.attributes || {};
  const userGroup = attrs["custom:group"];
  const givenName =
    attrs["given_name"] || attrs["name"] || email || "User";

  localStorage.setItem(
    "domitsUser",
    JSON.stringify({
      group: userGroup,
      name: givenName,
    })
  );

  setErrorMessage("");
  cleanup();

  if (userGroup === "Host") {
    window.location.href = "/hostdashboard";
  } else if (userGroup === "Traveler") {
    window.location.href = "/guestdashboard";
  } else {
    window.location.href = "/";
  }
};
