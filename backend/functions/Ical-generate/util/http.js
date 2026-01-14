import responseHeaders from "./constant/responseHeader.json" with { type: "json" };

export const isOptions = (event) =>
  (event.httpMethod || event.requestContext?.http?.method) === "OPTIONS";

export const parseJson = (event) => {
  if (!event?.body) return null;
  try {
    return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch {
    return null;
  }
};

export const okJson = (body) => ({
  statusCode: 200,
  headers: responseHeaders,
  body: JSON.stringify(body),
});

export const okIcs = (icsText, filename = "domits.ics") => ({
  statusCode: 200,
  headers: {
    ...responseHeaders,
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  },
  body: icsText,
});

export const err = (status, message) => ({
  statusCode: status,
  headers: responseHeaders,
  body: JSON.stringify({ message }),
});