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

export class PropertyExternalCalendarRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getBlockedDatesByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const rows = await listSourcesByProperty(client, propertyId, {
      order: "DESC",
      tolerateMissingTable: true,
    });

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
  }
}
