import ExternalCalendarRepository from "../data/externalCalendarRepository.js";
import ConflictException from "../util/exception/ConflictException.js";
import ServiceUnavailableException from "../util/exception/ServiceUnavailableException.js";
import { resolveCalendarProvider } from "../../.shared/calendarProvider.js";
import {
  buildBlockedDatesFromEvents,
  buildDateRangeKeys,
  parseIcsToEvents,
} from "../../.shared/basicIcsUtils.js";

const MAX_ICS_BYTES = 2_000_000;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

class ExternalCalendarService {
  constructor() {
    this.repository = new ExternalCalendarRepository();
  }

  async ensureNoExternalConflict({ propertyId, arrivalMs, departureMs }) {
    const sources = await this.repository.listSources(propertyId);
    if (!Array.isArray(sources) || sources.length === 0) {
      return;
    }

    const blockedDates = await this.refreshSourcesAndCollectBlockedDates(propertyId, sources);
    const requestedDateKeys = buildDateRangeKeys(arrivalMs, departureMs);
    const conflictingDate = requestedDateKeys.find((key) => blockedDates.has(key));
    if (conflictingDate) {
      throw new ConflictException("Selected dates are unavailable due to an external booking.");
    }
  }

  async refreshSourcesAndCollectBlockedDates(propertyId, sources) {
    const blockedDates = new Set();

    for (const source of sources) {
      const sourceId = String(source?.sourceId || "").trim();
      const calendarUrl = String(source?.calendarUrl || "").trim();
      if (!sourceId || !calendarUrl) {
        continue;
      }

      try {
        const { events, meta } = await this.retrieveFromExternalCalendar(calendarUrl);
        const sourceBlockedDates = buildBlockedDatesFromEvents(events);
        sourceBlockedDates.forEach((dateKey) => blockedDates.add(dateKey));

        await this.repository.upsertSource({
          propertyId,
          sourceId,
          calendarName: String(source?.calendarName || "EXTERNAL").trim() || "EXTERNAL",
          calendarUrl,
          provider: resolveCalendarProvider({
            calendarProvider: source?.provider,
            calendarUrl,
            calendarName: source?.calendarName,
          }),
          blockedDatesText: JSON.stringify(sourceBlockedDates),
          lastSyncAt: new Date().toISOString(),
          etag: meta?.etag || null,
          lastModified: meta?.lastModified || null,
        });
      } catch (error) {
        console.error(
          `Failed to refresh external calendar for booking guard. propertyId=${propertyId} sourceId=${sourceId}`,
          error?.message || error
        );
        throw new ServiceUnavailableException(
          "Unable to validate external calendar availability right now. Please try again."
        );
      }
    }

    return blockedDates;
  }

  async retrieveFromExternalCalendar(calendarUrl) {
    const abortController = new AbortController();
    const timer = setTimeout(() => abortController.abort(), DEFAULT_FETCH_TIMEOUT_MS);

    let icsText;
    let etag = null;
    let lastModified = null;

    try {
      const response = await fetch(calendarUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Domits-Booking-External-Calendar-Guard/1.0",
          Accept: "text/calendar,*/*",
        },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch external calendar (status ${response.status})`);
      }

      etag = response.headers.get("etag");
      lastModified = response.headers.get("last-modified");

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_ICS_BYTES) {
        throw new Error("ICS file too large");
      }

      icsText = new TextDecoder("utf-8").decode(buffer);
    } finally {
      clearTimeout(timer);
    }

    return {
      events: parseIcsToEvents(icsText),
      meta: {
        etag,
        lastModified,
      },
    };
  }
}

export default ExternalCalendarService;
