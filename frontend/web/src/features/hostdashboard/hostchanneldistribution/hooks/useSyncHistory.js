import { useMemo } from "react";
import { getSyncHistory } from "../services/channexDistributionService";
import { toSyncHistoryRows } from "../utils/syncHistoryRows";
import { PROPERTY_REQUEST_STATE, usePropertyScopedRequest } from "./usePropertyScopedRequest";

export const SYNC_HISTORY_STATE = PROPERTY_REQUEST_STATE;

const ERROR_MESSAGE = "Failed to load the sync history for the Distribution tab:";

const requestHistory = (domitsPropertyId) => getSyncHistory({ domitsPropertyId });

export function useSyncHistory({ domitsPropertyId } = {}) {
  const { data, loadState } = usePropertyScopedRequest({
    propertyId: domitsPropertyId,
    request: requestHistory,
    select: toSyncHistoryRows,
    errorMessage: ERROR_MESSAGE,
  });
  return useMemo(() => ({ rows: data ?? [], loadState }), [data, loadState]);
}
