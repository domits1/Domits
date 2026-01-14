import { BadRequestException } from "../../util/exception/badRequestException.js";
import { buildIcs } from "../../util/icalBuilder.js";

export class Service {
  async generateCalendarIcs({ events, calendarName }) {
    if (!Array.isArray(events)) {
      throw new BadRequestException("events must be an array");
    }

    const icsText = buildIcs({
      events,
      calendarName: calendarName || "Domits",
    });

    return icsText;
  }
}