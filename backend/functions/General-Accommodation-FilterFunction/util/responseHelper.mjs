const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
};

export const ok = (body) => ({
  statusCode: 200,
  headers: HEADERS,
  body: JSON.stringify(body),
});

export const serverError = (message, details) => ({
  statusCode: 500,
  headers: HEADERS,
  body: JSON.stringify({ message, errorDetails: details }),
});
