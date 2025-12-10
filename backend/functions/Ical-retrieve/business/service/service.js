import { BadRequestException } from "../../util/exception/badRequestException.js";

export class Service {
  async retrieveFromExternalCalendar(calendarUrl) {
    if (!calendarUrl || typeof calendarUrl !== "string") {
      throw new BadRequestException("calendarUrl is required");
    }

    if (!calendarUrl.startsWith("http://") && !calendarUrl.startsWith("https://")) {
      throw new BadRequestException("calendarUrl must start with http:// or https://");
    }

    let icsText;
    try {
      const res = await fetch(calendarUrl);
      if (!res.ok) {
        throw new BadRequestException(
          `Failed to fetch external calendar (status ${res.status})`
        );
      }
      icsText = await res.text();
    } catch (e) {
      console.error("Error fetching external calendar:", e);
      throw new BadRequestException("Could not download external calendar URL");
    }

    const events = parseIcsToEvents(icsText);
    return { events };
  }
}

function parseIcsToEvents(icsText) {
  if (!icsText) return [];

  const lines = unfoldLines(icsText);
  const events = [];
  let current = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "BEGIN:VEVENT") {
      current = {};
    } else if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const parts = line.split(":");
      if (parts.length < 2) continue;
      const keyPart = parts[0];
      const value = parts.slice(1).join(":");
      const key = keyPart.split(";")[0];

      switch (key.toUpperCase()) {
        case "UID":
          current.UID = value;
          break;
        case "DTSTAMP":
          current.Dtstamp = value;
          break;
        case "DTSTART":
          current.Dtstart = value;
          break;
        case "DTEND":
          current.Dtend = value;
          break;
        case "SUMMARY":
          current.Summary = value;
          break;
        case "LOCATION":
          current.Location = value;
          break;
        case "STATUS":
          current.Status = value;
          break;
        default:
          break;
      }
    }
  }

  return events;
}

function unfoldLines(icsText) {
  const rawLines = icsText.split(/\r?\n/);
  const result = [];

  for (const line of rawLines) {
    if (!line) continue;
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (result.length === 0) {
        result.push(line.trimStart());
      } else {
        result[result.length - 1] += line.slice(1);
      }
    } else {
      result.push(line);
    }
  }

  return result;
}