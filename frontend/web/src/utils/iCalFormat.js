function iCalFormat(event) {
    const {
      Dtstart,
      Dtend,
      Summary,
      Description,
      Location,
      id,
      Status,
      Dtstamp,
      CheckIn,
      CheckOut,
      BookingId,
      AccommodationId,
      LastModified,
      lastModified, 
      Sequence,
      GuestId,
    } = event || {};
  
    const lm = LastModified || lastModified || "";
  
    return `BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//Domits/Domits Calendar//v1.0//EN
  CALSCALE:GREGORIAN
  BEGIN:VEVENT
  UID:${safeText(id)}
  SEQUENCE:${safeText(Sequence)}
  DTSTAMP:${formatICalDateTime(Dtstamp)}
  DTSTART:${formatICalDateTime(Dtstart)}
  DTEND:${formatICalDateTime(Dtend)}
  SUMMARY:${safeText(Summary)}
  DESCRIPTION:${formatDescription(safeText(Description))}
  X-CHECK-IN:${formatICalDateTime(CheckIn)}
  X-CHECK-OUT:${formatICalDateTime(CheckOut)}
  X-BOOKING-ID:${safeText(BookingId)}
  LOCATION:${formatLocation(Location)}
  STATUS:${safeText(Status)}
  X-ACCOMMODATION-ID:${safeText(AccommodationId)}
  LAST-MODIFIED:${formatICalDateTime(lm)}
  X-GUEST-ID:${safeText(GuestId)}
  END:VEVENT
  END:VCALENDAR`;
  }
  
  export function formatDate(dateString) {
    const dt = new Date(dateString);
    const offset = dt.getTimezoneOffset();
    dt.setMinutes(dt.getMinutes() - offset);
    return dt.toISOString().replace(/-/g, "-").split(".")[0];
  }
  
  export function formatDescription(description) {
    const s = String(description || "");
    const desc = s.replace(/\r?\n/g, "\\n");
    const chunks = desc.match(/.{1,50}/g);
    return chunks ? chunks.join("\r\n ") : "";
  }
  
  export function formatDateTime(dateTime) {
    const dt = new Date(dateTime);
    const offset = dt.getTimezoneOffset();
    dt.setMinutes(dt.getMinutes() - offset);
    return dt
      .toISOString()
      .replace("T", " ")
      .split(":")
      .slice(0, 2)
      .join(":")
      .split(".")[0];
  }
  
  export function formatLocation(Location) {
    
    if (!Location) return "Location data is incomplete";
  
    if (typeof Location === "string") {
    
      return String(Location).replace(/,/g, "\\,");
    }
  
 
    if (!Location.Street || !Location.City || !Location.Country) {
      return "Location data is incomplete";
    }
  
    const formattedLocation =
      String(Location.Street).replace(/,/g, "\\,") +
      ", " +
      String(Location.City).replace(/,/g, "\\,") +
      ", " +
      String(Location.Country).replace(/,/g, "\\,");
  
    return formattedLocation;
  }
  
  function formatICalDateTime(dateTime) {
    if (!dateTime) return "";
    const dt = new Date(dateTime);
    if (isNaN(dt.getTime())) {
      console.error("Invalid date provided:", dateTime);
      return "";
    }
  
    const year = dt.getUTCFullYear();
    const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dt.getUTCDate()).padStart(2, "0");
    const hours = String(dt.getUTCHours()).padStart(2, "0");
    const minutes = String(dt.getUTCMinutes()).padStart(2, "0");
    const seconds = String(dt.getUTCSeconds()).padStart(2, "0");
  
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }
  
  function safeText(v) {
    if (v === null || v === undefined) return "";
    return String(v).replace(/\r?\n/g, " ").trim();
  }
  
  export function downloadICal(event) {
    const icsContent = iCalFormat(event);
  
    const blob = new Blob([icsContent], { type: "text/calendar" });
  
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${(event?.Summary || "calendar").toString()}.ics`;
  
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  const event = {
    id: "0",
    Sequence: "0",
    Dtstamp: "",
    Dtstart: "",
    Dtend: "",
    Title: "Placeholder",
    Summary: "Placeholder",
    Description: "Placeholder",
    CheckIn: "",
    CheckOut: "",
    BookingId: "0",
    Location: "Placeholder",
    Status: "TENTATIVE",
    AccommodationId: "0",
    lastModified: "",
    GuestId: "0",
  };
  
  export default iCalFormat;