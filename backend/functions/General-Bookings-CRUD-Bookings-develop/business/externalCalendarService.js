import ExternalCalendarRepository from "../data/externalCalendarRepository.js";
import ConflictException from "../util/exception/ConflictException.js";
import ServiceUnavailableException from "../util/exception/ServiceUnavailableException.js";
import {
  buildBlockedDatesFromEvents,
  buildDateRangeKeys,
} from "../.shared/basicIcsUtils.js";
import { buildSourceUpsertPayload, fetchExternalCalendar } from "../.shared/icalTransport.js";

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

        await this.repository.upsertSource(
          buildSourceUpsertPayload({
            propertyId,
            source,
            blockedDates: sourceBlockedDates,
            meta,
          })
        );
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
    return fetchExternalCalendar({
      calendarUrl,
      userAgent: "Domits-Booking-External-Calendar-Guard/1.0",
    });
  }
}

export default ExternalCalendarService;
