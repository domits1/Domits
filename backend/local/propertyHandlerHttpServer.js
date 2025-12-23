import http from "http";
import { URL } from "url";
import { handler } from "../functions/PropertyHandler/index.js";

const DEFAULT_PORT = 4001;

const json = (res, statusCode, body, extraHeaders = {}) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    ...extraHeaders,
  };

  res.writeHead(statusCode, headers);
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return undefined;
  return raw;
};

const toLambdaEvent = async (req, url) => {
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);

  // Expect: /property/<group>/<subResource>
  // Examples:
  // - /property/bookingEngine/all
  // - /property/bookingEngine/byType
  // - /property/hostDashboard/all
  const group = segments[1];
  const subResource = segments[2];

  const resource = group
    ? `/property/${group}/{subResource}`
    : "/property/{subResource}";

  const queryStringParameters = {};
  for (const [k, v] of url.searchParams.entries()) {
    queryStringParameters[k] = v;
  }

  const rawBody = await readBody(req);

  return {
    httpMethod: req.method,
    resource,
    pathParameters: { subResource },
    queryStringParameters: Object.keys(queryStringParameters).length ? queryStringParameters : undefined,
    headers: {
      Authorization: req.headers.authorization ?? req.headers.Authorization,
      "Content-Type": req.headers["content-type"],
    },
    body: rawBody,
  };
};

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      json(res, 400, { message: "Missing url" });
      return;
    }

    if (req.method === "OPTIONS") {
      json(res, 200, { ok: true });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (!url.pathname.startsWith("/property/")) {
      json(res, 404, { message: "Not found" });
      return;
    }

    const event = await toLambdaEvent(req, url);
    const lambdaRes = await handler(event);

    const body = lambdaRes?.body ?? "";
    const headers = lambdaRes?.headers ?? {};

    res.writeHead(lambdaRes?.statusCode ?? 200, {
      ...headers,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    json(res, 500, { message: err?.message ?? String(err) });
  }
});

const port = Number(process.env.PORT ?? DEFAULT_PORT);
server.listen(port, () => {
  console.log(`PropertyHandler local server listening on http://localhost:${port}`);
});
