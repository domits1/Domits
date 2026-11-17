import { isDsqlConflict, withDsqlRetry } from "../../.shared/dsqlRetry.js";
import { WebsiteDeleteConflictError } from "../../util/exception/WebsiteDeleteConflictError.js";

export const retryWebsiteDelete = async (work) => {
  try {
    return await withDsqlRetry(work);
  } catch (error) {
    if (isDsqlConflict(error)) {
      throw new WebsiteDeleteConflictError({ cause: error });
    }
    throw error;
  }
};
