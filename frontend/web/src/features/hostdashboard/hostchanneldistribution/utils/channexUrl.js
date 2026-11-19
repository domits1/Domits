// The connect screen runs inside our page, so the address the backend sends is checked before it
// becomes an iframe source: https only, a Channex host, no credentials in the address.
//
// TO CONFIRM WITH ENES: the hosts. The repo uses app.channex.io and staging.channex.io; any other
// subdomain of channex.io is accepted too until Enes confirms the exact list.
const CHANNEX_DOMAIN = "channex.io";

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

  const host = url.hostname.toLowerCase();
  return host === CHANNEX_DOMAIN || host.endsWith(`.${CHANNEX_DOMAIN}`);
}
