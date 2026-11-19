export const ALL_OPTION = "all";

const ACCENTS = /[̀-ͯ]/g;

const searchText = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(ACCENTS, "")
    .trim()
    .toLowerCase();

const isAll = (value) => value === undefined || value === null || value === "" || value === ALL_OPTION;

const matchesOption = (selected, value) => isAll(selected) || selected === value;

export const filterIntegrations = (integrations, { query, category, status } = {}) => {
  const search = searchText(query);
  return (Array.isArray(integrations) ? integrations : []).filter(
    (integration) =>
      searchText(integration.name).includes(search) &&
      matchesOption(category, integration.category) &&
      matchesOption(status, integration.status)
  );
};

export const optionsFor = (integrations, key) => [
  ...new Set((Array.isArray(integrations) ? integrations : []).map((integration) => integration[key])),
];

export const hasActiveFilters = ({ query, category, status } = {}) =>
  searchText(query) !== "" || !isAll(category) || !isAll(status);
