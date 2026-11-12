const byListingsThenName = (left, right) =>
  right.activeListings - left.activeListings || left.name.localeCompare(right.name);

const orderBySlugList = (destinations, slugs) => {
  const rank = (destination) => {
    const index = slugs.indexOf(destination.slug);
    return index === -1 ? slugs.length : index;
  };
  return [...destinations].sort((left, right) => rank(left) - rank(right) || byListingsThenName(left, right));
};

const toMenuItem = (destination) => ({
  name: destination.name,
  path: destination.path,
  activeListings: destination.activeListings,
});

export const buildDestinationMenu = (destinations, { featured = [], continentOrder = [] } = {}) => {
  const eligible = (Array.isArray(destinations) ? destinations : [])
    .filter((destination) => destination.eligible)
    .map((destination) => ({ ...destination, activeListings: Number(destination.totalListings) || 0 }));
  const childrenOf = (parent, type) =>
    eligible.filter((destination) => destination.parentId === parent.id && destination.type === type);

  const continents = orderBySlugList(
    eligible.filter((destination) => destination.type === "continent"),
    continentOrder
  ).map((continent) => ({
    ...toMenuItem(continent),
    countries: orderBySlugList(childrenOf(continent, "country"), featured).map((country) => ({
      ...toMenuItem(country),
      cities: orderBySlugList(childrenOf(country, "city"), featured).map(toMenuItem),
    })),
  }));

  return { continents };
};
