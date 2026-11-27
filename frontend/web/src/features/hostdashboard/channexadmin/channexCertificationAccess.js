import { Auth } from "aws-amplify";
import { getChannexAdminAccess } from "../hostintegrations/channexApi";

export const CHANNEX_CERTIFICATION_ADMIN_ROUTE = "admin/channex-diagnostics";
// Kept so bookmarks and links from before the rename still reach the page.
export const CHANNEX_CERTIFICATION_LEGACY_ADMIN_ROUTE = "admin/channex-certification";

export const checkChannexCertificationAccess = async (userId) => {
  if (!userId) return false;

  try {
    const response = await getChannexAdminAccess({ userId });
    return response?.allowed === true;
  } catch {
    return false;
  }
};

// Shared by the sidebar link and the Distribution route guard so both use the same check.
export const loadChannexAccess = async () => {
  const user = await Auth.currentAuthenticatedUser();
  return checkChannexCertificationAccess(user?.attributes?.sub);
};

export const CHANNEX_ACCESS_STATE = { ALLOWED: "allowed", DENIED: "denied", ERROR: "error" };

const isDeniedStatus = (status) => status === 401 || status === 403;

// Unlike loadChannexAccess, a failed check is reported as ERROR instead of being read as "no access".
export const loadChannexAccessState = async () => {
  let user;
  try {
    user = await Auth.currentAuthenticatedUser();
  } catch {
    return CHANNEX_ACCESS_STATE.DENIED;
  }
  const userId = user?.attributes?.sub;
  if (!userId) return CHANNEX_ACCESS_STATE.DENIED;

  try {
    const response = await getChannexAdminAccess({ userId });
    if (response?.allowed === true) return CHANNEX_ACCESS_STATE.ALLOWED;
    if (response?.allowed === false) return CHANNEX_ACCESS_STATE.DENIED;
    console.error("Unexpected answer from the Distribution access check:", response);
    return CHANNEX_ACCESS_STATE.ERROR;
  } catch (error) {
    if (isDeniedStatus(error?.status)) return CHANNEX_ACCESS_STATE.DENIED;
    console.error("Failed to check the access to Distribution:", error);
    return CHANNEX_ACCESS_STATE.ERROR;
  }
};
