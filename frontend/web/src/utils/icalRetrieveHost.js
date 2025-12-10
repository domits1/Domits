import { getAccessToken } from "../services/getAccessToken";

const ICAL_RETRIEVE_URL =
  "https://eiul3lr63m.execute-api.eu-north-1.amazonaws.com/default/Ical-retrieve";

export async function retrieveExternalCalendar(calendarUrl) {
  const token = getAccessToken();

  const res = await fetch(ICAL_RETRIEVE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({ calendarUrl }),
  });

  if (!res.ok) {
    let message = `Failed to retrieve calendar (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
    }
    throw new Error(message);
  }

  const data = await res.json();
  return data.events || [];
}