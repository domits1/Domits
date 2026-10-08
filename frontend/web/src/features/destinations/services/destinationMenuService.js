const DESTINATION_MENU_URL =
  "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/destinations/menu";
const DESTINATION_PATH_PREFIX = "/destinations/";

let menuPromise = null;

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

export const fetchDestinationMenu = () => {
  if (!menuPromise) {
    menuPromise = fetch(DESTINATION_MENU_URL, { method: "GET" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`The destination menu answered ${response.status}.`);
        }
        return normalizeDestinationMenu(await response.json());
      })
      .catch((error) => {
        menuPromise = null;
        throw error;
      });
  }
  return menuPromise;
};

export const forgetDestinationMenu = () => {
  menuPromise = null;
};
