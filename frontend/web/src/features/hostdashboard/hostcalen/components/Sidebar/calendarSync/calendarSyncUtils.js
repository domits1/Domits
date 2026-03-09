import calendarIcon from "../../../../../../images/icons/calendar.png";
import airbnbIcon from "../../../../../../images/icon-airbnb.png";
import bookingIcon from "../../../../../../images/icon-booking.png";
import { CALENDAR_PROVIDER } from "../../../hooks/hostCalendarHelpers";
import { SOURCE_SYNC_STATE } from "./calendarSyncConstants";

export const resolveSourceId = (source, index) =>
  String(source?.sourceId || source?.id || `${index}`);

export const resolveSourceName = (source) =>
  String(source?.calendarName || source?.name || "External calendar");

export const getProviderIcon = (provider) => {
  if (provider === CALENDAR_PROVIDER.AIRBNB) {
    return airbnbIcon;
  }
  if (provider === CALENDAR_PROVIDER.BOOKING) {
    return bookingIcon;
  }
  return calendarIcon;
};

export const formatLastSyncLabel = (value) => {
  if (!value) {
    return "Last synced: unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Last synced: unknown";
  }

  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) {
    return "Last synced: just now";
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return "Last synced: just now";
  }
  if (diffMinutes < 60) {
    return `Last synced: ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Last synced: ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Last synced: ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
};

export const resolveSourceSyncButtonLabel = (syncState) => {
  if (syncState === SOURCE_SYNC_STATE.PENDING) {
    return "Queued...";
  }
  if (syncState === SOURCE_SYNC_STATE.SYNCING) {
    return "Syncing...";
  }
  if (syncState === SOURCE_SYNC_STATE.SUCCESS) {
    return "Synced";
  }
  if (syncState === SOURCE_SYNC_STATE.ERROR) {
    return "Retry sync";
  }
  return "Sync now";
};

export const resolveSourceSyncStatusLabel = (syncState) => {
  if (syncState === SOURCE_SYNC_STATE.PENDING) {
    return "Queued for sync";
  }
  if (syncState === SOURCE_SYNC_STATE.SYNCING) {
    return "Syncing now";
  }
  if (syncState === SOURCE_SYNC_STATE.SUCCESS) {
    return "Sync complete";
  }
  if (syncState === SOURCE_SYNC_STATE.ERROR) {
    return "Sync failed";
  }
  return "Sync active";
};
