import { BadRequestException } from "../../util/exception/badRequestException.js";
import { buildIcs } from "../../util/icalBuilder.js";
import { Repository } from "../../data/repository.js";
import { icsKeyForOwner } from "../../util/ics.js";

export class Service {
  constructor() {
    this.repository = new Repository();
  }

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

  async generateCalendarLink({ events, calendarName, ownerId, filename }) {
    const icsText = await this.generateCalendarIcs({ events, calendarName });

    const baseName = filename ? String(filename).replace(/\.ics$/i, "") : "availability";
    const key = icsKeyForOwner(ownerId || "public", baseName);
    const url = await this.repository.uploadIcsAndPresign(key, icsText);

    return { url, key };
  }
}