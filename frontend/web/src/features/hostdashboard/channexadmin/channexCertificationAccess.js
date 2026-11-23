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
