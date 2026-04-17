import Database from "database";
import { listSourcesByProperty } from "../../../.shared/icalSourceRepositoryHelpers.js";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const safeParseJson = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
};

const normalizeTimestamp = (value) => {
  if (value == null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const parsedDate = new Date(String(value));
  const parsedTimestamp = parsedDate.getTime();
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null;
};

const buildBlockedDateKeys = (rows) => {
  const blockedDateKeys = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const blockedDates = safeParseJson(row?.blockedDates);
    (Array.isArray(blockedDates) ? blockedDates : []).forEach((dateKey) => {
      const normalizedKey = String(dateKey || "").trim();
      if (DATE_KEY_PATTERN.test(normalizedKey)) {
        blockedDateKeys.add(normalizedKey);
      }
    });
  });

  return Array.from(blockedDateKeys).sort((left, right) => left.localeCompare(right));
};

const mapCalendarSyncSource = (row) => ({
  propertyId: String(row?.propertyId || "").trim(),
  sourceId: String(row?.sourceId || "").trim(),
  calendarName: String(row?.calendarName || "").trim(),
  calendarUrl: String(row?.calendarUrl || "").trim(),
  provider: String(row?.provider || "").trim(),
  lastSyncAt: normalizeTimestamp(row?.lastSyncAt),
  updatedAt: normalizeTimestamp(row?.updatedAt),
});

export class PropertyExternalCalendarRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getAvailabilitySnapshotByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const rows = await listSourcesByProperty(client, propertyId, {
      order: "DESC",
      tolerateMissingTable: true,
    });

    const blockedDateKeys = buildBlockedDateKeys(rows);
    const syncSources = (Array.isArray(rows) ? rows : []).map(mapCalendarSyncSource);
    const syncedSourceCount = syncSources.length;
    const lastSyncAt = syncSources.reduce((latestTimestamp, source) => {
      const candidateTimestamp = source.lastSyncAt || source.updatedAt;
      if (!candidateTimestamp) {
        return latestTimestamp;
      }

      return latestTimestamp && latestTimestamp > candidateTimestamp ? latestTimestamp : candidateTimestamp;
    }, null);

    return {
      externalBlockedDates: blockedDateKeys,
      hasExternalCalendarSync: syncedSourceCount > 0,
      syncedSourceCount,
      lastSyncAt,
      syncSources,
    };
  }

  async getBlockedDatesByPropertyId(propertyId) {
    const snapshot = await this.getAvailabilitySnapshotByPropertyId(propertyId);
    return snapshot.externalBlockedDates;
  }
}
