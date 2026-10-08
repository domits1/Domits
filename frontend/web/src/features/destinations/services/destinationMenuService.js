const DESTINATION_MENU_URL =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/destinations/menu";
const DESTINATION_PATH_PREFIX = "/destinations/";
const MENU_TTL_MS = 5 * 60 * 1000;
const MENU_TIMEOUT_MS = 10 * 1000;

let menu = null;

const withTimeout = (promise) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("The destination menu did not answer in time.")), MENU_TIMEOUT_MS);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });

const toItem = (item) => ({
  name: String(item?.name || "").trim(),
  path: String(item?.path || "").trim(),
  activeListings: Number(item?.activeListings) || 0,
});

const hasPage = (item) => Boolean(item.name) && item.path.startsWith(DESTINATION_PATH_PREFIX);

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

const load = async () => {
  const response = await fetch(DESTINATION_MENU_URL, { method: "GET" });
  if (!response.ok) {
    throw new Error(`The destination menu answered ${response.status}.`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload?.continents)) {
    throw new TypeError("The destination menu answered an unexpected shape.");
  }
  return normalizeDestinationMenu(payload);
};

export const fetchDestinationMenu = () => {
  if (!menu || menu.expiresAt <= Date.now()) {
    const promise = withTimeout(load()).catch((error) => {
      if (menu?.promise === promise) {
        menu = null;
      }
      throw error;
    });
    menu = { promise, expiresAt: Date.now() + MENU_TTL_MS };
  }
  return menu.promise;
};

export const forgetDestinationMenu = () => {
  menu = null;
};
