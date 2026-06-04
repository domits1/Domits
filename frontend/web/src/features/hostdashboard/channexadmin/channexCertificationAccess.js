import { getChannexAdminAccess } from "../hostintegrations/channexApi";

export const CHANNEX_CERTIFICATION_ADMIN_ROUTE = "admin/channex-certification";

export const checkChannexCertificationAccess = async (userId) => {
  if (!userId) return false;

  try {
    const response = await getChannexAdminAccess({ userId });
    return response?.allowed === true;
  } catch {
    return false;
  }
};
