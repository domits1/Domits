import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getCognitoUserId } from "../../../../services/getAccessToken";
import {
  dbDeleteIcalSource,
  dbListIcalSources,
  dbRefreshIcalSource,
  dbRefreshAllIcalSources,
  dbUpsertIcalSource,
} from "../../../../utils/icalRetrieveHost";
import {
  ICAL_EXPORT_BUCKET,
  ICAL_EXPORT_REGION,
  INITIAL_CALENDAR_SYNC_FORM,
  normalizeCalendarProviderForForm,
} from "./hostCalendarHelpers";

const SOURCE_SYNC_STATE = {
  IDLE: "idle",
  PENDING: "pending",
  SYNCING: "syncing",
  SUCCESS: "success",
  ERROR: "error",
};
const SOURCE_SUCCESS_STATE_RESET_DELAY_MS = 3200;
const SOURCES_POLL_INTERVAL_MS = 60000;

const resolveSourceId = (source, index) => String(source?.sourceId || source?.id || `${index}`).trim();
const resolveStableSourceId = (source) => String(source?.sourceId || source?.id || "").trim();
const resolveOrderingKey = (source, index) => resolveStableSourceId(source) || `__index-${index}`;

const orderSourcesByPreviousOrder = (previousSources, incomingSources) => {
  const safePreviousSources = Array.isArray(previousSources) ? previousSources : [];
  const safeIncomingSources = Array.isArray(incomingSources) ? incomingSources : [];
  if (!safePreviousSources.length || !safeIncomingSources.length) {
    return safeIncomingSources;
  }

  const previousOrderKeys = safePreviousSources.map((source, index) =>
    resolveOrderingKey(source, index)
  );
  const incomingEntries = safeIncomingSources.map((source, index) => ({
    source,
    key: resolveOrderingKey(source, index),
  }));
  const incomingByKey = new Map(incomingEntries.map((entry) => [entry.key, entry.source]));
  const orderedSources = [];

  previousOrderKeys.forEach((key) => {
    if (!incomingByKey.has(key)) {
      return;
    }
    orderedSources.push(incomingByKey.get(key));
    incomingByKey.delete(key);
  });

  incomingEntries.forEach((entry) => {
    if (!incomingByKey.has(entry.key)) {
      return;
    }
    orderedSources.push(entry.source);
    incomingByKey.delete(entry.key);
  });

  return orderedSources;
};

const buildSyncStateMapForSources = (sources, previousStateById = {}) => {
  const nextStateById = {};
  const sourceList = Array.isArray(sources) ? sources : [];
  sourceList.forEach((source, index) => {
    const sourceId = resolveSourceId(source, index);
    if (!sourceId) {
      return;
    }
    nextStateById[sourceId] = previousStateById[sourceId] || SOURCE_SYNC_STATE.IDLE;
  });
  return nextStateById;
};

const isUnknownActionError = (error) =>
  String(error?.message || "").trim().toLowerCase().includes("unknown action");

const SOURCE_SYNC_IN_PROGRESS_STATES = new Set([
  SOURCE_SYNC_STATE.PENDING,
  SOURCE_SYNC_STATE.SYNCING,
]);

const isSourceSyncInProgress = (state) => SOURCE_SYNC_IN_PROGRESS_STATES.has(state);

const hasAnySourceSyncInProgress = (sourceSyncStateById) =>
  Object.values(sourceSyncStateById).some(isSourceSyncInProgress);

const extractSourcesAndBlockedDates = (data) => {
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const blockedDates = Array.isArray(data?.blockedDates) ? data.blockedDates : [];
  return { sources, blockedDates };
};

const resolveEditableProvider = (persistedProvider) => {
  if (["airbnb", "booking", "generic"].includes(persistedProvider)) {
    return persistedProvider;
  }
  return "auto";
};

const validateCalendarSourceSave = ({
  selectedPropertyId,
  editingSourceId,
  sourceBeingEdited,
  calendarUrl,
  calendarName,
}) => {
  if (!selectedPropertyId) {
    return "Select a listing first.";
  }
  if (editingSourceId && !sourceBeingEdited) {
    return "Could not update calendar connection. Please retry.";
  }
  if (!calendarUrl || !calendarName) {
    return "Both the calendar link and calendar name are required.";
  }
  return "";
};

const isValidPublicIcalUrl = (calendarUrl) => {
  try {
    const parsedCalendarUrl = new URL(calendarUrl);
    return parsedCalendarUrl.protocol === "http:" || parsedCalendarUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const refreshSourceSyncState = ({ setSourceSyncStateById, sourceId, state }) => {
  setSourceSyncStateById((previous) => ({
    ...previous,
    [sourceId]: state,
  }));
};

const applyAllSourceSyncState = ({ setSourceSyncStateById, sourceIds, nextState }) => {
  setSourceSyncStateById((previous) => {
    const nextStateById = { ...previous };
    sourceIds.forEach((sourceId) => {
      nextStateById[sourceId] = nextState;
    });
    return nextStateById;
  });
};

const markInFlightSourceSyncsAsError = ({ setSourceSyncStateById, sourceIds }) => {
  setSourceSyncStateById((previous) => {
    const nextStateById = { ...previous };
    sourceIds.forEach((sourceId) => {
      if (isSourceSyncInProgress(nextStateById[sourceId])) {
        nextStateById[sourceId] = SOURCE_SYNC_STATE.ERROR;
      }
    });
    return nextStateById;
  });
};

const shouldSkipRefreshRequest = ({
  isSavingCalendarSync,
  removingCalendarSourceId,
  isRefreshingAnySource,
  isRefreshingAllCalendarSources,
}) =>
  isSavingCalendarSync ||
  removingCalendarSourceId ||
  isRefreshingAnySource ||
  isRefreshingAllCalendarSources;

const collectSourceIds = (sources) =>
  (Array.isArray(sources) ? sources : [])
    .map((source, index) => resolveSourceId(source, index))
    .filter(Boolean);

const markSourcesAsPending = ({ setSourceSyncStateById, calendarSources, sourceIds }) => {
  setSourceSyncStateById((previous) => {
    const nextStateById = buildSyncStateMapForSources(calendarSources, previous);
    sourceIds.forEach((sourceId) => {
      nextStateById[sourceId] = SOURCE_SYNC_STATE.PENDING;
    });
    return nextStateById;
  });
};

const resetSourceSyncStateIfSuccessful = (previousStateById, sourceId) => {
  if (previousStateById[sourceId] !== SOURCE_SYNC_STATE.SUCCESS) {
    return previousStateById;
  }
  return {
    ...previousStateById,
    [sourceId]: SOURCE_SYNC_STATE.IDLE,
  };
};

const scheduleSourceSuccessReset = ({
  sourceId,
  sourceSuccessResetTimersRef,
  setSourceSyncStateById,
}) => {
  if (sourceSuccessResetTimersRef.current.has(sourceId)) {
    return;
  }

  const resetTimerId = setTimeout(() => {
    sourceSuccessResetTimersRef.current.delete(sourceId);
    setSourceSyncStateById((previous) => resetSourceSyncStateIfSuccessful(previous, sourceId));
  }, SOURCE_SUCCESS_STATE_RESET_DELAY_MS);

  sourceSuccessResetTimersRef.current.set(sourceId, resetTimerId);
};

const syncSuccessResetTimers = ({
  sourceSyncStateById,
  sourceSuccessResetTimersRef,
  setSourceSyncStateById,
  clearSourceSuccessResetTimer,
}) => {
  const activeSuccessSourceIds = new Set();

  for (const [sourceId, sourceState] of Object.entries(sourceSyncStateById)) {
    if (sourceState !== SOURCE_SYNC_STATE.SUCCESS) {
      continue;
    }

    activeSuccessSourceIds.add(sourceId);
    scheduleSourceSuccessReset({
      sourceId,
      sourceSuccessResetTimersRef,
      setSourceSyncStateById,
    });
  }

  for (const sourceId of Array.from(sourceSuccessResetTimersRef.current.keys())) {
    if (activeSuccessSourceIds.has(sourceId)) {
      continue;
    }
    clearSourceSuccessResetTimer(sourceId);
  }
};

const refreshSingleSourceWithinAll = async ({
  sourceId,
  selectedPropertyId,
  applyRefreshedSources,
  setSourceSyncStateById,
}) => {
  refreshSourceSyncState({
    setSourceSyncStateById,
    sourceId,
    state: SOURCE_SYNC_STATE.SYNCING,
  });

  try {
    const response = await dbRefreshIcalSource({
      propertyId: selectedPropertyId,
      sourceId,
    });
    const { sources, blockedDates } = extractSourcesAndBlockedDates(response);
    applyRefreshedSources(sources, blockedDates);
    setSourceSyncStateById((previous) => {
      const nextStateById = buildSyncStateMapForSources(sources, previous);
      nextStateById[sourceId] = SOURCE_SYNC_STATE.SUCCESS;
      return nextStateById;
    });
    return { shouldFallbackToRefreshAll: false, errorMessage: "" };
  } catch (error) {
    if (isUnknownActionError(error)) {
      return { shouldFallbackToRefreshAll: true, errorMessage: "" };
    }
    refreshSourceSyncState({
      setSourceSyncStateById,
      sourceId,
      state: SOURCE_SYNC_STATE.ERROR,
    });
    return {
      shouldFallbackToRefreshAll: false,
      errorMessage: error?.message || "One or more calendars could not be refreshed.",
    };
  }
};

const refreshSourcesSequentially = async ({
  sourceIds,
  selectedPropertyId,
  applyRefreshedSources,
  setSourceSyncStateById,
}) => {
  let firstErrorMessage = "";
  for (const sourceId of sourceIds) {
    const result = await refreshSingleSourceWithinAll({
      sourceId,
      selectedPropertyId,
      applyRefreshedSources,
      setSourceSyncStateById,
    });
    if (result.shouldFallbackToRefreshAll) {
      return { shouldFallbackToRefreshAll: true, firstErrorMessage };
    }
    if (!firstErrorMessage && result.errorMessage) {
      firstErrorMessage = result.errorMessage;
    }
  }
  return { shouldFallbackToRefreshAll: false, firstErrorMessage };
};

const runRefreshAllFallback = async ({
  sourceIds,
  selectedPropertyId,
  applyRefreshedSources,
  setSourceSyncStateById,
}) => {
  try {
    const response = await dbRefreshAllIcalSources(selectedPropertyId);
    const { sources, blockedDates } = extractSourcesAndBlockedDates(response);
    applyRefreshedSources(sources, blockedDates);
    applyAllSourceSyncState({
      setSourceSyncStateById,
      sourceIds,
      nextState: SOURCE_SYNC_STATE.SUCCESS,
    });
    return "";
  } catch (error) {
    markInFlightSourceSyncsAsError({
      setSourceSyncStateById,
      sourceIds,
    });
    return error?.message || "Could not refresh calendar connections.";
  }
};

export const useCalendarSync = ({ selectedPropertyId }) => {
  const [externalBlockedDates, setExternalBlockedDates] = useState(new Set());
  const [calendarSources, setCalendarSources] = useState([]);
  const [sourceSyncStateById, setSourceSyncStateById] = useState({});
  const [calendarSyncForm, setCalendarSyncForm] = useState(INITIAL_CALENDAR_SYNC_FORM);
  const [calendarSyncError, setCalendarSyncError] = useState("");
  const [isSavingCalendarSync, setIsSavingCalendarSync] = useState(false);
  const [isLoadingCalendarSync, setIsLoadingCalendarSync] = useState(false);
  const [removingCalendarSourceId, setRemovingCalendarSourceId] = useState("");
  const [isRefreshingAllCalendarSources, setIsRefreshingAllCalendarSources] = useState(false);
  const [editingCalendarSourceId, setEditingCalendarSourceId] = useState("");
  const [domitsCalendarLinkCopied, setDomitsCalendarLinkCopied] = useState(false);
  const calendarSourcesRef = useRef([]);
  const sourceSuccessResetTimersRef = useRef(new Map());

  const clearSourceSuccessResetTimer = (sourceId) => {
    const normalizedSourceId = String(sourceId || "").trim();
    if (!normalizedSourceId) {
      return;
    }
    const activeTimer = sourceSuccessResetTimersRef.current.get(normalizedSourceId);
    if (!activeTimer) {
      return;
    }
    clearTimeout(activeTimer);
    sourceSuccessResetTimersRef.current.delete(normalizedSourceId);
  };

  const clearAllSourceSuccessResetTimers = () => {
    sourceSuccessResetTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
    });
    sourceSuccessResetTimersRef.current.clear();
  };

  useEffect(() => {
    calendarSourcesRef.current = calendarSources;
  }, [calendarSources]);

  useEffect(
    () => () => {
      clearAllSourceSuccessResetTimers();
    },
    []
  );

  useEffect(() => {
    syncSuccessResetTimers({
      sourceSyncStateById,
      sourceSuccessResetTimersRef,
      setSourceSyncStateById,
      clearSourceSuccessResetTimer,
    });
  }, [sourceSyncStateById]);

  useEffect(() => {
    let mounted = true;

    const loadCalendarSources = async () => {
      if (!selectedPropertyId) {
        if (mounted) {
          clearAllSourceSuccessResetTimers();
          setExternalBlockedDates(new Set());
          setCalendarSources([]);
          setSourceSyncStateById({});
          setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
          setCalendarSyncError("");
          setIsSavingCalendarSync(false);
          setIsLoadingCalendarSync(false);
          setRemovingCalendarSourceId("");
          setIsRefreshingAllCalendarSources(false);
          setEditingCalendarSourceId("");
          setDomitsCalendarLinkCopied(false);
        }
        return;
      }

      setIsLoadingCalendarSync(true);
      setCalendarSyncError("");

      try {
        const data = await dbListIcalSources(selectedPropertyId);
        const sources = Array.isArray(data?.sources) ? data.sources : [];
        const blockedDates = Array.isArray(data?.blockedDates) ? data.blockedDates : [];

        if (!mounted) {
          return;
        }

        setCalendarSources(sources);
        setSourceSyncStateById((previous) => buildSyncStateMapForSources(sources, previous));
        setExternalBlockedDates(new Set(blockedDates));
        setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
        setRemovingCalendarSourceId("");
        setIsRefreshingAllCalendarSources(false);
        setEditingCalendarSourceId("");
        setDomitsCalendarLinkCopied(false);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setCalendarSources([]);
        setSourceSyncStateById({});
        setExternalBlockedDates(new Set());
        setCalendarSyncError(error?.message || "Could not load calendar connections.");
      } finally {
        if (mounted) {
          setIsLoadingCalendarSync(false);
        }
      }
    };

    loadCalendarSources();

    return () => {
      mounted = false;
    };
  }, [selectedPropertyId]);

  const hostCalendarExportUrl = useMemo(() => {
    const hostUserId = String(getCognitoUserId() || "").trim();
    const propertyId = String(selectedPropertyId || "").trim();
    if (!hostUserId || !propertyId) {
      return "";
    }
    return `https://${ICAL_EXPORT_BUCKET}.s3.${ICAL_EXPORT_REGION}.amazonaws.com/hosts/${hostUserId}/${propertyId}.ics`;
  }, [selectedPropertyId]);

  const calendarUrlInput = String(calendarSyncForm.calendarUrl || "");
  const calendarNameInput = String(calendarSyncForm.calendarName || "");
  const calendarProviderInput = String(calendarSyncForm.calendarProvider || "auto")
    .trim()
    .toLowerCase();
  const isEditingCalendarSource = Boolean(String(editingCalendarSourceId || "").trim());

  const calendarSourceById = useMemo(() => {
    const map = new Map();
    const sourceList = Array.isArray(calendarSources) ? calendarSources : [];
    sourceList.forEach((source, index) => {
      const sourceId = resolveSourceId(source, index);
      if (sourceId) {
        map.set(sourceId, source);
      }
    });
    return map;
  }, [calendarSources]);

  const editingCalendarSource = useMemo(() => {
    if (!isEditingCalendarSource) {
      return null;
    }
    return calendarSourceById.get(String(editingCalendarSourceId || "").trim()) || null;
  }, [calendarSourceById, editingCalendarSourceId, isEditingCalendarSource]);

  const hasCalendarEditChanges = useMemo(() => {
    if (!isEditingCalendarSource || !editingCalendarSource) {
      return false;
    }

    const initialUrl = String(editingCalendarSource?.calendarUrl || editingCalendarSource?.url || "").trim();
    const initialName = String(editingCalendarSource?.calendarName || editingCalendarSource?.name || "").trim();
    const initialProvider = normalizeCalendarProviderForForm(
      editingCalendarSource?.calendarProvider || editingCalendarSource?.provider || ""
    );

    const currentUrl = String(calendarUrlInput || "").trim();
    const currentName = String(calendarNameInput || "").trim();
    const currentProvider = normalizeCalendarProviderForForm(calendarProviderInput);

    return (
      currentUrl !== initialUrl ||
      currentName !== initialName ||
      currentProvider !== initialProvider
    );
  }, [
    calendarNameInput,
    calendarProviderInput,
    calendarUrlInput,
    editingCalendarSource,
    isEditingCalendarSource,
  ]);

  const canAddCalendarSource =
    Boolean(selectedPropertyId) &&
    !isSavingCalendarSync &&
    !removingCalendarSourceId &&
    !isRefreshingAllCalendarSources &&
    !hasAnySourceSyncInProgress(sourceSyncStateById) &&
    calendarUrlInput.trim().length > 0 &&
    calendarNameInput.trim().length > 0 &&
    (!isEditingCalendarSource || hasCalendarEditChanges);

  const refreshingSourceIds = useMemo(
    () =>
      Object.entries(sourceSyncStateById)
        .filter(
          ([, state]) => state === SOURCE_SYNC_STATE.SYNCING || state === SOURCE_SYNC_STATE.PENDING
        )
        .map(([sourceId]) => sourceId),
    [sourceSyncStateById]
  );
  const isRefreshingAnySource = refreshingSourceIds.length > 0;
  const refreshingCalendarSourceId = refreshingSourceIds[0] || "";

  const updateCalendarSyncForm = (partialForm) => {
    if (!partialForm || typeof partialForm !== "object") {
      return;
    }
    setCalendarSyncError("");
    setCalendarSyncForm((previous) => ({
      ...previous,
      ...partialForm,
    }));
  };

  const handleCopyDomitsCalendarLink = async () => {
    if (!hostCalendarExportUrl || !navigator?.clipboard) {
      return;
    }
    try {
      await navigator.clipboard.writeText(hostCalendarExportUrl);
      setDomitsCalendarLinkCopied(true);
      setTimeout(() => setDomitsCalendarLinkCopied(false), 1800);
    } catch {
      setCalendarSyncError("Could not copy calendar link. Please copy it manually.");
    }
  };

  const handleEditCalendarSource = (sourceId) => {
    const normalizedSourceId = String(sourceId || "").trim();
    if (!normalizedSourceId) {
      setCalendarSyncError("Could not edit calendar connection.");
      return;
    }

    const source = calendarSourceById.get(normalizedSourceId);
    if (!source) {
      setCalendarSyncError("Could not load calendar connection.");
      return;
    }

    const persistedProvider = String(source?.calendarProvider || source?.provider || "")
      .trim()
      .toLowerCase();
    const editableProvider = resolveEditableProvider(persistedProvider);

    setEditingCalendarSourceId(normalizedSourceId);
    setCalendarSyncError("");
    setCalendarSyncForm({
      calendarUrl: String(source?.calendarUrl || source?.url || "").trim(),
      calendarName: String(source?.calendarName || source?.name || "").trim(),
      calendarProvider: editableProvider,
    });
  };

  const handleCancelEditCalendarSource = () => {
    setEditingCalendarSourceId("");
    setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
    setCalendarSyncError("");
  };

  const applyCalendarSourcesPayload = useCallback(({ sources, blockedDates }) => {
    const orderedSources = orderSourcesByPreviousOrder(calendarSourcesRef.current, sources);
    calendarSourcesRef.current = orderedSources;
    setCalendarSources(orderedSources);
    setSourceSyncStateById((previous) => buildSyncStateMapForSources(orderedSources, previous));
    setExternalBlockedDates(new Set(blockedDates));
  }, []);

  const persistSourceChange = async ({
    propertyId,
    editingSourceId,
    calendarUrl,
    calendarName,
    calendarProvider,
    hasSourceUrlChanged,
  }) => {
    let data = await dbUpsertIcalSource({
      propertyId,
      calendarUrl,
      calendarName,
      calendarProvider,
    });

    if (!hasSourceUrlChanged) {
      return { data, warningMessage: "" };
    }

    try {
      data = await dbDeleteIcalSource({
        propertyId,
        sourceId: editingSourceId,
      });
      return { data, warningMessage: "" };
    } catch {
      const latestData = await dbListIcalSources(propertyId);
      return {
        data: extractSourcesAndBlockedDates(latestData),
        warningMessage: "Calendar updated, but old source could not be removed. Remove it manually.",
      };
    }
  };

  const handleAddCalendarSource = async () => {
    const calendarUrl = calendarUrlInput.trim();
    const calendarName = calendarNameInput.trim();
    const calendarProvider = calendarProviderInput === "auto" ? "" : calendarProviderInput;
    const normalizedEditingSourceId = String(editingCalendarSourceId || "").trim();
    const sourceBeingEdited = normalizedEditingSourceId
      ? calendarSourceById.get(normalizedEditingSourceId) || null
      : null;
    const previousSourceUrl = String(sourceBeingEdited?.calendarUrl || sourceBeingEdited?.url || "").trim();
    const hasSourceUrlChangedWhileEditing =
      Boolean(normalizedEditingSourceId) &&
      Boolean(previousSourceUrl) &&
      previousSourceUrl !== calendarUrl;

    const validationError = validateCalendarSourceSave({
      selectedPropertyId,
      editingSourceId: normalizedEditingSourceId,
      sourceBeingEdited,
      calendarUrl,
      calendarName,
    });
    if (validationError) {
      setCalendarSyncError(validationError);
      return;
    }
    if (!isValidPublicIcalUrl(calendarUrl)) {
      setCalendarSyncError("Enter a valid public iCal URL (http/https).");
      return;
    }

    setIsSavingCalendarSync(true);
    setCalendarSyncError("");

    try {
      const { data, warningMessage } = await persistSourceChange({
        propertyId: selectedPropertyId,
        editingSourceId: normalizedEditingSourceId,
        calendarUrl,
        calendarName,
        calendarProvider,
        hasSourceUrlChanged: hasSourceUrlChangedWhileEditing,
      });
      const payload = extractSourcesAndBlockedDates(data);
      applyCalendarSourcesPayload(payload);
      setEditingCalendarSourceId("");
      setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
      if (warningMessage) {
        setCalendarSyncError(warningMessage);
      }
    } catch (error) {
      setCalendarSyncError(error?.message || "Could not save calendar connection.");
    } finally {
      setIsSavingCalendarSync(false);
    }
  };

  const handleRemoveCalendarSource = async (sourceId) => {
    const normalizedSourceId = String(sourceId || "").trim();
    if (!selectedPropertyId) {
      setCalendarSyncError("Select a listing first.");
      return;
    }
    if (!normalizedSourceId) {
      setCalendarSyncError("Could not remove calendar connection.");
      return;
    }

    setRemovingCalendarSourceId(normalizedSourceId);
    setCalendarSyncError("");

    try {
      const data = await dbDeleteIcalSource({
        propertyId: selectedPropertyId,
        sourceId: normalizedSourceId,
      });
      const payload = extractSourcesAndBlockedDates(data);
      applyCalendarSourcesPayload(payload);
      if (normalizedSourceId === String(editingCalendarSourceId || "").trim()) {
        setEditingCalendarSourceId("");
        setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
      }
    } catch (error) {
      setCalendarSyncError(error?.message || "Could not remove calendar connection.");
    } finally {
      setRemovingCalendarSourceId("");
    }
  };

  const applyRefreshedSources = (sources, blockedDates) => {
    applyCalendarSourcesPayload({ sources, blockedDates });

    if (editingCalendarSourceId) {
      const normalizedEditingSourceId = String(editingCalendarSourceId || "").trim();
      const editingSourceStillExists = sources.some((source, index) => {
        const currentSourceId = resolveSourceId(source, index);
        return currentSourceId === normalizedEditingSourceId;
      });
      if (!editingSourceStillExists) {
        setEditingCalendarSourceId("");
        setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
      }
    }
  };

  const handleRefreshCalendarSource = async (sourceId) => {
    const normalizedSourceId = String(sourceId || "").trim();
    if (!selectedPropertyId) {
      setCalendarSyncError("Select a listing first.");
      return;
    }
    if (!normalizedSourceId) {
      setCalendarSyncError("Could not refresh calendar connection.");
      return;
    }
    if (
      shouldSkipRefreshRequest({
        isSavingCalendarSync,
        removingCalendarSourceId,
        isRefreshingAnySource,
        isRefreshingAllCalendarSources,
      })
    ) {
      return;
    }

    refreshSourceSyncState({
      setSourceSyncStateById,
      sourceId: normalizedSourceId,
      state: SOURCE_SYNC_STATE.SYNCING,
    });
    clearSourceSuccessResetTimer(normalizedSourceId);
    setCalendarSyncError("");

    try {
      let data = null;
      let usedRefreshAllFallback = false;

      try {
        data = await dbRefreshIcalSource({
          propertyId: selectedPropertyId,
          sourceId: normalizedSourceId,
        });
      } catch (refreshSourceError) {
        if (!isUnknownActionError(refreshSourceError)) {
          throw refreshSourceError;
        }
        usedRefreshAllFallback = true;
        data = await dbRefreshAllIcalSources(selectedPropertyId);
      }

      const { sources, blockedDates } = extractSourcesAndBlockedDates(data);
      applyRefreshedSources(sources, blockedDates);
      setSourceSyncStateById((previous) => {
        const nextStateById = buildSyncStateMapForSources(sources, previous);
        if (Object.hasOwn(nextStateById, normalizedSourceId) || !usedRefreshAllFallback) {
          nextStateById[normalizedSourceId] = SOURCE_SYNC_STATE.SUCCESS;
        }
        return nextStateById;
      });
    } catch (error) {
      refreshSourceSyncState({
        setSourceSyncStateById,
        sourceId: normalizedSourceId,
        state: SOURCE_SYNC_STATE.ERROR,
      });
      setCalendarSyncError(error?.message || "Could not refresh calendar connections.");
    }
  };

  const handleRefreshAllCalendarSources = async () => {
    if (!selectedPropertyId) {
      setCalendarSyncError("Select a listing first.");
      return;
    }
    if (
      shouldSkipRefreshRequest({
        isSavingCalendarSync,
        removingCalendarSourceId,
        isRefreshingAnySource,
        isRefreshingAllCalendarSources,
      })
    ) {
      return;
    }

    const sourceIds = collectSourceIds(calendarSources);
    if (sourceIds.length === 0) {
      return;
    }

    setIsRefreshingAllCalendarSources(true);
    setCalendarSyncError("");
    markSourcesAsPending({
      setSourceSyncStateById,
      calendarSources,
      sourceIds,
    });

    let firstErrorMessage = "";
    try {
      const refreshSequenceResult = await refreshSourcesSequentially({
        sourceIds,
        selectedPropertyId,
        applyRefreshedSources,
        setSourceSyncStateById,
      });
      firstErrorMessage = refreshSequenceResult.firstErrorMessage;

      if (refreshSequenceResult.shouldFallbackToRefreshAll) {
        const fallbackErrorMessage = await runRefreshAllFallback({
          sourceIds,
          selectedPropertyId,
          applyRefreshedSources,
          setSourceSyncStateById,
        });
        if (!firstErrorMessage && fallbackErrorMessage) {
          firstErrorMessage = fallbackErrorMessage;
        }
      }
    } finally {
      setIsRefreshingAllCalendarSources(false);
      if (firstErrorMessage) {
        setCalendarSyncError(firstErrorMessage);
      }
    }
  };

  useEffect(() => {
    if (!selectedPropertyId) {
      return undefined;
    }

    let cancelled = false;
    const pollSources = async () => {
      if (
        isSavingCalendarSync ||
        removingCalendarSourceId ||
        isRefreshingAllCalendarSources ||
        hasAnySourceSyncInProgress(sourceSyncStateById)
      ) {
        return;
      }

      try {
        const data = await dbListIcalSources(selectedPropertyId);
        if (cancelled) {
          return;
        }
        const payload = extractSourcesAndBlockedDates(data);
        applyCalendarSourcesPayload(payload);
      } catch {
        // Keep polling silent to avoid noisy UI while user is idle.
      }
    };

    const pollIntervalId = setInterval(pollSources, SOURCES_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(pollIntervalId);
    };
  }, [
    selectedPropertyId,
    isSavingCalendarSync,
    removingCalendarSourceId,
    isRefreshingAllCalendarSources,
    sourceSyncStateById,
    applyCalendarSourcesPayload,
  ]);

  return {
    externalBlockedDates,
    calendarSources,
    calendarSyncForm,
    calendarSyncError,
    isSavingCalendarSync,
    isLoadingCalendarSync,
    removingCalendarSourceId,
    refreshingCalendarSourceId,
    sourceSyncStateById,
    isRefreshingAllCalendarSources,
    editingCalendarSourceId,
    domitsCalendarLinkCopied,
    hostCalendarExportUrl,
    calendarUrlInput,
    calendarNameInput,
    calendarProviderInput,
    isEditingCalendarSource,
    canAddCalendarSource,
    updateCalendarSyncForm,
    handleCopyDomitsCalendarLink,
    handleEditCalendarSource,
    handleCancelEditCalendarSource,
    handleAddCalendarSource,
    handleRemoveCalendarSource,
    handleRefreshCalendarSource,
    handleRefreshAllCalendarSources,
  };
};
