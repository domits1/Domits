const DESTINATION_MENU_URL =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/destinations/menu";
const DESTINATION_PAGE_PATH = /^\/destinations(?:\/[a-z0-9]+(?:-[a-z0-9]+)*){1,3}$/;

export const DESTINATION_MENU_TIMEOUT_MS = 8000;
export const DESTINATION_MENU_TTL_MS = 5 * 60 * 1000;
export const DESTINATION_MENU_FAILURE_PAUSE_MS = 60 * 1000;

let kept = null;

const toItem = (item) => ({
  name: String(item?.name || "").trim(),
  path: String(item?.path || "").trim(),
  activeListings: Number(item?.activeListings) || 0,
});

const hasPage = (item) => Boolean(item.name) && DESTINATION_PAGE_PATH.test(item.path);

const toList = (value) => (Array.isArray(value) ? value : []);

export const normalizeDestinationMenu = (payload) =>
  toList(payload?.continents)
    .map((continent) => ({
      ...toItem(continent),
      countries: toList(continent?.countries)
        .map((country) => ({
          ...toItem(country),
          cities: toList(country?.cities).map(toItem).filter(hasPage),
        }))
        .filter(hasPage),
    }))
    .filter(hasPage);

const requestMenu = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DESTINATION_MENU_TIMEOUT_MS);
  try {
    const response = await fetch(DESTINATION_MENU_URL, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`The destination menu answered ${response.status}.`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload?.continents)) {
      throw new TypeError("The destination menu answered an unexpected shape.");
    }
    return normalizeDestinationMenu(payload);
  } finally {
    clearTimeout(timer);
  }
};

export const fetchDestinationMenu = () => {
  if (kept && Date.now() < kept.expiresAt) {
    return kept.promise;
  }
  const entry = { expiresAt: Date.now() + DESTINATION_MENU_TTL_MS };
  entry.promise = requestMenu().catch((error) => {
    console.warn("The destinations menu is not available:", error?.name, error?.message);
    entry.expiresAt = Date.now() + DESTINATION_MENU_FAILURE_PAUSE_MS;
    return [];
  });
  kept = entry;
  return entry.promise;
};

export const forgetDestinationMenu = () => {
  kept = null;
};
