import { randomUUID } from "node:crypto";

export const OTA_NAMESPACE = "http://www.opentravel.org/OTA/2003/05"; // NOSONAR

const XML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (char) => XML_ESCAPES[char]);
}

export function otaHeaderAttributes({ echoToken = randomUUID(), now = new Date() } = {}) {
  return `xmlns="${OTA_NAMESPACE}" Version="1.0" TimeStamp="${now.toISOString()}" EchoToken="${escapeXml(echoToken)}"`;
}

export function wrapSoapEnvelope({ username, password, body }) {
  if (!username || !password) {
    throw new Error("SiteMinder username and password are required");
  }
  return [
    '<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/">',
    "<SOAP-ENV:Header>",
    '<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" SOAP-ENV:mustUnderstand="1">',
    "<wsse:UsernameToken>",
    `<wsse:Username>${escapeXml(username)}</wsse:Username>`,
    `<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${escapeXml(password)}</wsse:Password>`,
    "</wsse:UsernameToken>",
    "</wsse:Security>",
    "</SOAP-ENV:Header>",
    `<SOAP-ENV:Body>${body}</SOAP-ENV:Body>`,
    "</SOAP-ENV:Envelope>",
  ].join("");
}

function unescapeXml(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function readAttribute(tag, name) {
  const match = new RegExp(String.raw`\s${name}="([^"]*)"`).exec(tag);
  return match ? unescapeXml(match[1]) : null;
}

export function parseOtaResponse(xml) {
  const text = String(xml ?? "");

  const fault = /<(?:[\w-]+:)?Fault\b[\s\S]*?<faultstring[^>]*>([\s\S]*?)<\/faultstring>/.exec(text);
  if (fault) {
    return { success: false, errors: [{ type: "SoapFault", code: null, message: unescapeXml(fault[1].trim()) }] };
  }

  if (/<(?:[\w-]+:)?Success\s*\/?>/.test(text)) {
    return { success: true, errors: [] };
  }

  const errors = [...text.matchAll(/<(?:[\w-]+:)?Error\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?Error>/g)].map(([, attrs, body]) => {
    const type = readAttribute(attrs, "Type");
    const code = readAttribute(attrs, "Code");
    return {
      type: type === null ? null : Number(type),
      code: code === null ? null : Number(code),
      message: unescapeXml(body.trim()),
    };
  });

  if (errors.length === 0) {
    return { success: false, errors: [{ type: null, code: null, message: "Unrecognised SiteMinder response" }] };
  }
  return { success: false, errors };
}