const WEBSITE_PREVIEW_SYNC_STORAGE_KEY = "domits.websitePreview.updated";

const parsePreviewSyncPayload = (rawValue) => {
  if (typeof rawValue !== "string" || !rawValue.trim()) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object") {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
};

export const announceWebsitePreviewUpdate = (draftId) => {
  const normalizedDraftId = String(draftId || "").trim();
  if (!normalizedDraftId || !globalThis.localStorage) {
    return;
  }

  try {
    globalThis.localStorage.setItem(
      WEBSITE_PREVIEW_SYNC_STORAGE_KEY,
      JSON.stringify({
        draftId: normalizedDraftId,
        updatedAt: Date.now(),
      })
    );
  } catch {
    // Ignore localStorage failures; preview updates still persist server-side.
  }
};

export const subscribeToWebsitePreviewUpdates = (draftId, onPreviewUpdate) => {
  const normalizedDraftId = String(draftId || "").trim();
  if (!normalizedDraftId || typeof onPreviewUpdate !== "function") {
    return () => {};
  }

  const handleStorage = (event) => {
    if (event.key !== WEBSITE_PREVIEW_SYNC_STORAGE_KEY) {
      return;
    }

    const payload = parsePreviewSyncPayload(event.newValue);
    if (payload?.draftId !== normalizedDraftId) {
      return;
    }

    onPreviewUpdate(payload);
  };

  globalThis.addEventListener("storage", handleStorage);

  return () => {
    globalThis.removeEventListener("storage", handleStorage);
  };
};
