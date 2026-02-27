import { useEffect, useMemo, useState } from "react";

import { getCognitoUserId } from "../../../../services/getAccessToken";
import { dbDeleteIcalSource, dbListIcalSources, dbUpsertIcalSource } from "../../../../utils/icalRetrieveHost";
import {
  ICAL_EXPORT_BUCKET,
  ICAL_EXPORT_REGION,
  INITIAL_CALENDAR_SYNC_FORM,
  normalizeCalendarProviderForForm,
} from "./hostCalendarHelpers";

export const useCalendarSync = ({ selectedPropertyId }) => {
  const [externalBlockedDates, setExternalBlockedDates] = useState(new Set());
  const [calendarSources, setCalendarSources] = useState([]);
  const [calendarSyncForm, setCalendarSyncForm] = useState(INITIAL_CALENDAR_SYNC_FORM);
  const [calendarSyncError, setCalendarSyncError] = useState("");
  const [isSavingCalendarSync, setIsSavingCalendarSync] = useState(false);
  const [isLoadingCalendarSync, setIsLoadingCalendarSync] = useState(false);
  const [removingCalendarSourceId, setRemovingCalendarSourceId] = useState("");
  const [editingCalendarSourceId, setEditingCalendarSourceId] = useState("");
  const [domitsCalendarLinkCopied, setDomitsCalendarLinkCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadCalendarSources = async () => {
      if (!selectedPropertyId) {
        if (mounted) {
          setExternalBlockedDates(new Set());
          setCalendarSources([]);
          setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
          setCalendarSyncError("");
          setIsSavingCalendarSync(false);
          setIsLoadingCalendarSync(false);
          setRemovingCalendarSourceId("");
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
        setExternalBlockedDates(new Set(blockedDates));
        setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
        setRemovingCalendarSourceId("");
        setEditingCalendarSourceId("");
        setDomitsCalendarLinkCopied(false);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setCalendarSources([]);
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
      const sourceId = String(source?.sourceId || source?.id || `${index}`).trim();
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
    calendarUrlInput.trim().length > 0 &&
    calendarNameInput.trim().length > 0 &&
    (!isEditingCalendarSource || hasCalendarEditChanges);

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
    const editableProvider = ["airbnb", "booking", "generic"].includes(persistedProvider)
      ? persistedProvider
      : "auto";

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

    if (!selectedPropertyId) {
      setCalendarSyncError("Select a listing first.");
      return;
    }
    if (normalizedEditingSourceId && !sourceBeingEdited) {
      setCalendarSyncError("Could not update calendar connection. Please retry.");
      return;
    }
    if (!calendarUrl || !calendarName) {
      setCalendarSyncError("Both the calendar link and calendar name are required.");
      return;
    }

    let parsedCalendarUrl;
    try {
      parsedCalendarUrl = new URL(calendarUrl);
    } catch {
      setCalendarSyncError("Enter a valid public iCal URL (http/https).");
      return;
    }

    if (parsedCalendarUrl.protocol !== "http:" && parsedCalendarUrl.protocol !== "https:") {
      setCalendarSyncError("Enter a valid public iCal URL (http/https).");
      return;
    }

    setIsSavingCalendarSync(true);
    setCalendarSyncError("");

    try {
      let data = await dbUpsertIcalSource({
        propertyId: selectedPropertyId,
        calendarUrl,
        calendarName,
        calendarProvider,
      });

      if (hasSourceUrlChangedWhileEditing) {
        try {
          data = await dbDeleteIcalSource({
            propertyId: selectedPropertyId,
            sourceId: normalizedEditingSourceId,
          });
        } catch {
          setCalendarSyncError(
            "Calendar updated, but old source could not be removed. Remove it manually."
          );
          const latestData = await dbListIcalSources(selectedPropertyId);
          data = {
            sources: Array.isArray(latestData?.sources) ? latestData.sources : [],
            blockedDates: Array.isArray(latestData?.blockedDates) ? latestData.blockedDates : [],
          };
        }
      }

      const sources = Array.isArray(data?.sources) ? data.sources : [];
      const blockedDates = Array.isArray(data?.blockedDates) ? data.blockedDates : [];

      setCalendarSources(sources);
      setExternalBlockedDates(new Set(blockedDates));
      setEditingCalendarSourceId("");
      setCalendarSyncForm({ ...INITIAL_CALENDAR_SYNC_FORM });
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
      const sources = Array.isArray(data?.sources) ? data.sources : [];
      const blockedDates = Array.isArray(data?.blockedDates) ? data.blockedDates : [];

      setCalendarSources(sources);
      setExternalBlockedDates(new Set(blockedDates));
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

  return {
    externalBlockedDates,
    calendarSources,
    calendarSyncForm,
    calendarSyncError,
    isSavingCalendarSync,
    isLoadingCalendarSync,
    removingCalendarSourceId,
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
  };
};
