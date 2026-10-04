var LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
var MAX_HOSTNAME_LENGTH = 253;

function normalizeHostName(value) {
  var host = String(value || "")
    .trim()
    .toLowerCase();
  var portIndex = host.indexOf(":");
  if (portIndex !== -1) {
    host = host.slice(0, portIndex);
  }
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

function handler(event) {
  var request = event.request;
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return request;
    }
    if (request.uri !== "/" && request.uri !== "/index.html") {
      return request;
    }
    var hostHeader = request.headers.host;
    var host = normalizeHostName(hostHeader && hostHeader.value);
    if (!isHostName(host)) {
      return request;
    }
    request.uri = "/sites/by-host/" + host + "/index.html";
    return request;
  } catch (error) {
    return request;
  }
}
