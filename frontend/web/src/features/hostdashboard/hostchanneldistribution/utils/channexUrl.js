// The connect screen runs inside our page, so the address the backend sends is checked before it
// becomes an iframe source: https only, one of the two hosts Channex serves it from, and no
// credentials in the address.
const CHANNEX_CONNECT_HOSTS = new Set(["app.channex.io", "staging.channex.io"]);

export function isChannexUrl(value) {
  if (typeof value !== "string") return false;

  let url;
  try {
    url = new URL(value);
  } catch {
    // Relative and protocol-relative addresses have no base to resolve against, so they land here.
    return false;
  }

  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;

  return CHANNEX_CONNECT_HOSTS.has(url.hostname);
}
