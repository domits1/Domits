var LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
var PORT_PATTERN = /^[0-9]{1,5}$/;
var MAX_HOSTNAME_LENGTH = 253;
var MAX_URI_LENGTH = 8192;
var PAGE_KEY_PREFIX = "/sites/by-host/";
var HOST_FILES = { "/": "index.html", "/index.html": "index.html", "/sitemap.xml": "sitemap.xml" };
var ROBOTS_URI = "/robots.txt";

function normalizeHostName(value) {
  var parts = String(value || "")
    .trim()
    .toLowerCase()
    .split(":");
  if (parts.length > 2 || (parts.length === 2 && !PORT_PATTERN.test(parts[1]))) {
    return "";
  }
  var host = parts[0];
  if (host.slice(-1) === ".") {
    host = host.slice(0, -1);
  }
  return host;
}

function isHostName(host) {
  if (!host || host.length > MAX_HOSTNAME_LENGTH) {
    return false;
  }
  var labels = host.split(".");
  if (labels.length < 2) {
    return false;
  }
  for (var index = 0; index < labels.length; index += 1) {
    if (!LABEL_PATTERN.test(labels[index])) {
      return false;
    }
  }
  return true;
}

function queryStringLength(querystring) {
  var length = 0;
  for (var name in querystring) {
    var entry = querystring[name];
    var values = entry && entry.multiValue ? entry.multiValue : [entry];
    for (var index = 0; index < values.length; index += 1) {
      length += name.length + 2 + String((values[index] && values[index].value) || "").length;
    }
  }
  return length;
}

function isPageKeyRequest(uri) {
  var decoded = uri;
  try {
    decoded = decodeURIComponent(uri);
  } catch (error) {
    decoded = uri;
  }
  return decoded.indexOf(PAGE_KEY_PREFIX) === 0;
}

function robotsResponse(host, method) {
  var response = {
    statusCode: 200,
    statusDescription: "OK",
    headers: {
      "content-type": { value: "text/plain; charset=utf-8" },
      "cache-control": { value: "public, max-age=300" },
    },
  };
  if (method !== "HEAD") {
    response.body = { encoding: "text", data: "User-agent: *\nAllow: /\nSitemap: https://" + host + "/sitemap.xml\n" };
  }
  return response;
}

function handler(event) {
  try {
    var request = event.request;
    if (isPageKeyRequest(request.uri)) {
      return { statusCode: 404, statusDescription: "Not Found" };
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return request;
    }
    var isRobots = request.uri === ROBOTS_URI;
    if (!isRobots && !Object.prototype.hasOwnProperty.call(HOST_FILES, request.uri)) {
      return request;
    }
    var hostHeader = request.headers.host;
    if (!hostHeader || (hostHeader.multiValue && hostHeader.multiValue.length > 1)) {
      return request;
    }
    var host = normalizeHostName(hostHeader.value);
    if (!isHostName(host)) {
      return request;
    }
    if (isRobots) {
      return robotsResponse(host, request.method);
    }
    var pageUri = PAGE_KEY_PREFIX + host + "/" + HOST_FILES[request.uri];
    if (pageUri.length + queryStringLength(request.querystring) >= MAX_URI_LENGTH) {
      return request;
    }
    request.uri = pageUri;
    return request;
  } catch (error) {
    return event && event.request;
  }
}
