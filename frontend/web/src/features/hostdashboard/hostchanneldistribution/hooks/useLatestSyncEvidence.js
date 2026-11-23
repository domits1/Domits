import { useMemo } from "react";
import { getLatestSyncEvidence } from "../services/channexDistributionService";
import { PROPERTY_REQUEST_STATE, usePropertyScopedRequest } from "./usePropertyScopedRequest";

export const LATEST_SYNC_STATE = PROPERTY_REQUEST_STATE;

const ERROR_MESSAGE = "Failed to load the last sync for the Distribution tab:";

const requestLatest = (domitsPropertyId) => getLatestSyncEvidence({ domitsPropertyId });
const selectItem = (evidence) => evidence?.item ?? null;

// The request carries no user id: the backend identifies the user from the token.
export function useLatestSyncEvidence({ domitsPropertyId } = {}) {
  const { data, loadState } = usePropertyScopedRequest({
    propertyId: domitsPropertyId,
    request: requestLatest,
    select: selectItem,
    errorMessage: ERROR_MESSAGE,
  });
  return useMemo(() => ({ item: data, loadState }), [data, loadState]);
}
