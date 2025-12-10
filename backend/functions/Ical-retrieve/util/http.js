import responseHeaders from "../util/constant/responseHeader.json" with { type: "json" };

export const ok = (body) => ({
  statusCode: 200,
  headers: responseHeaders,
  body: JSON.stringify(body),
});

export const err = (status, message) => ({
  statusCode: status,
  headers: responseHeaders,
  body: JSON.stringify({ message }),
});

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