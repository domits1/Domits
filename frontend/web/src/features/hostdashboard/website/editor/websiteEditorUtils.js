import PropTypes from "prop-types";
import {
  applyWebsiteDraftContentOverrides,
  buildWebsiteDraftEditorValues,
} from "../rendering/websiteDraftContentOverrides";
import {
  DEFAULT_WEBSITE_AMENITY_LABEL,
  WEBSITE_AMENITY_FALLBACK_CATEGORY,
} from "../config/websiteAmenitiesConfig";
import { buildPublishedWebsiteHref, buildWebsitePreviewPath } from "../websitePublicSiteLinks";
import { EDITOR_SECTION_KEYS, EDITOR_TARGET_KEYS } from "../websiteEditorConfig";

export const getImageOptionLabel = (index) => `Imported image ${index + 1}`;

const buildWebsiteAmenityItemId = (collectionSize) => {
  if (globalThis.crypto?.randomUUID) {
    return `website-amenity-${globalThis.crypto.randomUUID()}`;
  }

  return `website-amenity-${Date.now()}-${collectionSize + 1}`;
};

export const createAmenityEditorItem = (amenityIconOptions, collectionSize) => {
  const defaultIconOption = amenityIconOptions[0] || null;

  return {
    id: buildWebsiteAmenityItemId(collectionSize),
    iconAmenityId: String(defaultIconOption?.id || ""),
    label: DEFAULT_WEBSITE_AMENITY_LABEL,
    category: String(defaultIconOption?.category || WEBSITE_AMENITY_FALLBACK_CATEGORY),
  };
};

export const getSelectedImageForSlot = (slot, editorValues) => {
  if (slot.kind === "hero") {
    return editorValues.images.heroImage;
  }

  if (slot.kind === "residence") {
    return editorValues.images.residenceImage || "";
  }

  return editorValues.images.gallery[slot.index] || "";
};

export const normalizeUiErrorMessage = (message, fallbackMessage) => {
  const normalizedMessage = String(message || "").trim();
  if (!normalizedMessage || normalizedMessage.toLowerCase() === "failed to fetch") {
    return fallbackMessage;
  }

  return normalizedMessage;
};

export const readImageFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Select an image first."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
        return;
      }

      reject(new Error("We could not read that image file."));
    };
    reader.onerror = () => reject(new Error("We could not read that image file."));
    reader.readAsDataURL(file);
  });

export const formatStatusLabel = (status) => {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  switch (normalizedStatus) {
    case "PUBLISHED":
      return "Published";
    case "PREVIEW":
      return "Not published";
    case "ACTIVE":
      return "Active";
    case "DISABLED":
      return "Disabled";
    case "PENDING":
      return "Pending";
    case "VERIFIED":
      return "Verified";
    case "FAILED":
      return "Attention needed";
    case "SUSPENDED":
      return "Suspended";
    case "DRAFT":
      return "Draft";
    default:
      return normalizedStatus
        ? `${normalizedStatus.charAt(0)}${normalizedStatus.slice(1).toLowerCase()}`
        : "";
  }
};

export const getDraftWorkingContentOverrides = (draft) =>
  draft?.contentOverrides && typeof draft.contentOverrides === "object" ? draft.contentOverrides : {};

export const getDraftPublishedContentOverrides = (draft) =>
  draft?.publishedContentOverrides && typeof draft.publishedContentOverrides === "object"
    ? draft.publishedContentOverrides
    : {};

export const getDraftThemeOverrides = (draft) =>
  draft?.themeOverrides && typeof draft.themeOverrides === "object" ? draft.themeOverrides : {};

export const getDraftPublishedThemeOverrides = (draft) =>
  draft?.publishedThemeOverrides && typeof draft.publishedThemeOverrides === "object"
    ? draft.publishedThemeOverrides
    : {};

export const getPrimaryWebsiteDomain = (siteSummary) =>
  siteSummary?.primaryDomain && typeof siteSummary.primaryDomain === "object"
    ? siteSummary.primaryDomain
    : null;

export const buildEditorValuesFromDraft = (baseModel, draft, templateKey = "") =>
  buildWebsiteDraftEditorValues(
    applyWebsiteDraftContentOverrides(baseModel, getDraftWorkingContentOverrides(draft), templateKey),
    templateKey
  );

export const resolveSectionNode = (sectionRefEntry) => {
  if (!sectionRefEntry) {
    return null;
  }

  if (typeof sectionRefEntry.scrollIntoView === "function") {
    return sectionRefEntry;
  }

  if (sectionRefEntry.current && typeof sectionRefEntry.current.scrollIntoView === "function") {
    return sectionRefEntry.current;
  }

  return null;
};

export const getCenteredContainerScrollTop = (node, container) => {
  if (
    !node ||
    !container ||
    typeof node.getBoundingClientRect !== "function" ||
    typeof container.getBoundingClientRect !== "function"
  ) {
    return null;
  }

  const containerHeight = container.clientHeight || 0;
  if (containerHeight < 1) {
    return null;
  }

  const nodeRect = node.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const currentScrollTop = container.scrollTop || 0;
  const centeredTop =
    currentScrollTop + nodeRect.top - containerRect.top - containerHeight / 2 + nodeRect.height / 2;
  return Math.max(0, Math.round(centeredTop));
};

export const forwardEditorBoundaryScroll = (event) => {
  const editorPanelNode = event?.currentTarget;
  if (!editorPanelNode || typeof editorPanelNode.scrollTop !== "number") {
    return;
  }

  const deltaY = Number(event.deltaY || 0);
  if (!Number.isFinite(deltaY) || Math.abs(deltaY) < 0.01) {
    return;
  }

  const scrollTop = editorPanelNode.scrollTop || 0;
  const clientHeight = editorPanelNode.clientHeight || 0;
  const scrollHeight = editorPanelNode.scrollHeight || 0;
  const canScrollInternally = scrollHeight - clientHeight > 1;
  const isAtTop = scrollTop <= 0;
  const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;

  if (!canScrollInternally || (deltaY < 0 && isAtTop) || (deltaY > 0 && isAtBottom)) {
    event.preventDefault();
    if (typeof globalThis.scrollBy === "function") {
      globalThis.scrollBy({
        top: deltaY,
        behavior: "auto",
      });
    }
  }
};

export const runAfterNextPaint = (callback) => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    globalThis.requestAnimationFrame(() => {
      globalThis.requestAnimationFrame(() => {
        callback();
      });
    });
    return;
  }

  globalThis.setTimeout(callback, 0);
};

export const EDITOR_TARGET_FOCUS_MAX_ATTEMPTS = 8;
export const EDITOR_SECTION_EXPAND_SCROLL_RETRY_DELAY_MS = 280;

export const confirmDiscardDraftChanges = () => {
  if (typeof globalThis.confirm !== "function") {
    return true;
  }

  return globalThis.confirm(
    "Discard all draft-only changes and reset this editor back to the current published version?"
  );
};

export const getPublishLiveSiteActionLabel = (isPublishingSite) => {
  if (isPublishingSite) {
    return "Publishing...";
  }

  return "Publish live site";
};

export const getWebsiteActionMenuButtonLabel = ({
  hasLiveSite,
  isPublishingSite,
  isUpdatingLiveSite,
}) => {
  if (!hasLiveSite) {
    return isPublishingSite ? "Publishing website..." : "Publish website";
  }

  return isUpdatingLiveSite ? "Updating website..." : "Update website";
};

export const resolveWindowTargetOrigin = (href) => {
  const normalizedHref = String(href || "").trim();
  const baseOrigin = globalThis.location?.origin || "";

  if (!normalizedHref) {
    return baseOrigin;
  }

  try {
    return new URL(normalizedHref, baseOrigin).origin;
  } catch {
    return baseOrigin;
  }
};

export const getLiveLinkStatus = ({ primarySiteDomain, hasLiveSite }) => {
  if (primarySiteDomain?.status) {
    return formatStatusLabel(primarySiteDomain.status);
  }

  if (hasLiveSite) {
    return "Provisioning";
  }

  return "Not published";
};

export const resolvePublicSiteLinkPresentation = ({
  hasLiveSite,
  primarySiteDomain,
  siteSummary,
  draftId,
}) => {
  const normalizedDraftId = String(draftId || "").trim();
  const hasPreviewLink = Boolean(normalizedDraftId);

  if (hasLiveSite) {
    return {
      primaryLinkLabel: "Domits live link",
      primaryLinkValue: primarySiteDomain?.domain || "Available after first publish",
      secondaryLinkHref: primarySiteDomain?.domain
        ? buildPublishedWebsiteHref(primarySiteDomain.domain, siteSummary?.site?.id, primarySiteDomain.status)
        : "",
      secondaryLinkCopy: "Live site URL",
      secondaryLinkText: primarySiteDomain?.domain || "",
    };
  }

  const previewPath = hasPreviewLink ? buildWebsitePreviewPath(normalizedDraftId) : "";
  return {
    primaryLinkLabel: "Internal preview link",
    primaryLinkValue: previewPath || "Available after first save",
    secondaryLinkHref: previewPath,
    secondaryLinkCopy: "Preview URL",
    secondaryLinkText: previewPath,
  };
};

export const resolveEditorPreviewTargetId = ({ targetId, imageSlot, sectionId } = {}) => {
  if (targetId) {
    return targetId;
  }

  if (imageSlot?.kind === "hero") {
    return EDITOR_TARGET_KEYS.images.hero;
  }

  if (imageSlot?.kind === "residence") {
    return EDITOR_TARGET_KEYS.residence.image;
  }

  if (imageSlot?.kind === "gallery" && Number.isInteger(imageSlot.index)) {
    return EDITOR_TARGET_KEYS.images.gallery(imageSlot.index);
  }

  if (sectionId === EDITOR_SECTION_KEYS.common) {
    return EDITOR_TARGET_KEYS.common.heroTitle;
  }

  if (sectionId === EDITOR_SECTION_KEYS.residence) {
    return EDITOR_TARGET_KEYS.residence.title;
  }

  if (sectionId === EDITOR_SECTION_KEYS.calendar) {
    return EDITOR_TARGET_KEYS.calendar.visibility;
  }

  if (sectionId === EDITOR_SECTION_KEYS.amenities) {
    return EDITOR_TARGET_KEYS.amenities(0);
  }

  if (sectionId === EDITOR_SECTION_KEYS.contact) {
    return EDITOR_TARGET_KEYS.contact.title;
  }

  return "";
};

export const shouldSaveEditorFieldOnKeyDown = (field, event) => {
  if (field.component === "textarea") {
    return event.key === "Enter" && (event.metaKey || event.ctrlKey);
  }

  return event.key === "Enter";
};

export const createEditorFieldKeyDownHandler = (field, saveDraftChanges) => async (event) => {
  if (!shouldSaveEditorFieldOnKeyDown(field, event)) {
    return;
  }

  event.preventDefault();
  await saveDraftChanges();
};

export const activatePreviewTargetId = (setActivePreviewTargetId, targetId) => {
  setActivePreviewTargetId(String(targetId || "").trim());
};

export const clearPreviewTargetResetTimeout = (previewHighlightResetTimeoutRef) => {
  if (!previewHighlightResetTimeoutRef.current) {
    return;
  }

  globalThis.clearTimeout(previewHighlightResetTimeoutRef.current);
  previewHighlightResetTimeoutRef.current = null;
};

export const activateTemporaryPreviewTargetId = (
  setActivePreviewTargetId,
  previewHighlightResetTimeoutRef,
  targetId,
  durationMs = 1800
) => {
  const normalizedTargetId = String(targetId || "").trim();
  clearPreviewTargetResetTimeout(previewHighlightResetTimeoutRef);
  setActivePreviewTargetId(normalizedTargetId);

  if (!normalizedTargetId) {
    return;
  }

  previewHighlightResetTimeoutRef.current = globalThis.setTimeout(() => {
    setActivePreviewTargetId((currentTargetId) =>
      currentTargetId === normalizedTargetId ? "" : currentTargetId
    );
    previewHighlightResetTimeoutRef.current = null;
  }, durationMs);
};

export const getPreviewTargetIdForVisibilityField = (fieldKey) => {
  switch (String(fieldKey || "").trim()) {
    case "topBar":
      return EDITOR_TARGET_KEYS.common.siteTitle;
    case "trustCards":
      return "visibility.trustCards";
    case "gallerySection":
      return EDITOR_TARGET_KEYS.images.gallery(0);
    case "amenitiesPanel":
      return "visibility.amenitiesPanel";
    case "availabilityCalendar":
      return EDITOR_TARGET_KEYS.calendar.visibility;
    case "callToAction":
      return EDITOR_TARGET_KEYS.common.ctaLabel;
    case "journeyStops":
      return "visibility.journeyStops";
    case "contactSection":
      return EDITOR_TARGET_KEYS.contact.backgroundColor;
    case "chatWidget":
      return "visibility.chatWidget";
    default:
      return EDITOR_TARGET_KEYS.common.heroTitle;
  }
};

export const fieldPropTypes = PropTypes.shape({
  key: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  component: PropTypes.oneOf(["input", "textarea"]).isRequired,
});

export const refPropType = PropTypes.oneOfType([
  PropTypes.func,
  PropTypes.shape({
    current: PropTypes.any,
  }),
]);

export const primarySiteDomainPropType = PropTypes.shape({
  domain: PropTypes.string,
  status: PropTypes.string,
});

export const siteSummaryPropType = PropTypes.shape({
  isReachable: PropTypes.bool,
  site: PropTypes.shape({
    id: PropTypes.string,
  }),
});
