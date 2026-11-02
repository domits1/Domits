import { isDestinationSlug } from "../../util/destination/destinationSlug.js";
import { DESTINATIONS_ROOT_PATH } from "./destinationPageBuilder.js";

export const DESTINATION_PAGE_HOSTS = Object.freeze(["www.domits.com", "acceptance.domits.com"]);
export const DESTINATION_PAGE_DEFAULT_ORIGIN = "https://www.domits.com";
export const DESTINATION_PATH_MAX_LENGTH = 256;
const DESTINATION_PATH_MAX_SEGMENTS = 3;
const INVALID = Object.freeze({ kind: "invalid" });

const isDestinationPagePath = (path) => {
  if (path === DESTINATIONS_ROOT_PATH) {
    return true;
  }
  if (!path.startsWith(`${DESTINATIONS_ROOT_PATH}/`)) {
    return false;
  }
  const segments = path.slice(DESTINATIONS_ROOT_PATH.length + 1).split("/");
  return segments.length <= DESTINATION_PATH_MAX_SEGMENTS && segments.every(isDestinationSlug);
};

export const readDestinationRequestPath = (path) => {
  if (typeof path !== "string" || path.length === 0 || path.length > DESTINATION_PATH_MAX_LENGTH) {
    return INVALID;
  }
  if (isDestinationPagePath(path)) {
    return { kind: "page", path };
  }
  const withoutSlash = path.slice(0, -1);
  if (path.endsWith("/") && isDestinationPagePath(withoutSlash)) {
    return { kind: "redirect", location: withoutSlash };
  }
  return INVALID;
};

export const resolveDestinationSiteOrigin = (forwardedHost) => {
  const host = typeof forwardedHost === "string" ? forwardedHost.trim().toLowerCase() : "";
  return DESTINATION_PAGE_HOSTS.includes(host) ? `https://${host}` : DESTINATION_PAGE_DEFAULT_ORIGIN;
};
