const byListingsThenName = (left, right) =>
  right.activeListings - left.activeListings || left.name.localeCompare(right.name);

const orderWithFeatured = (destinations, featured) => {
  const rank = (destination) => {
    const index = featured.indexOf(destination.slug);
    return index === -1 ? featured.length : index;
  };
  return [...destinations].sort((left, right) => rank(left) - rank(right) || byListingsThenName(left, right));
};

const toMenuItem = (destination) => ({
  name: destination.name,
  path: destination.path,
  activeListings: destination.activeListings,
});

export const buildDestinationMenu = (destinations, { featured = [] } = {}) => {
  const eligible = (Array.isArray(destinations) ? destinations : [])
    .filter((destination) => destination.eligible)
    .map((destination) => ({ ...destination, activeListings: Number(destination.totalListings) || 0 }));
  const childrenOf = (parent, type) =>
    eligible.filter((destination) => destination.parentId === parent.id && destination.type === type);

  const continents = eligible
    .filter((destination) => destination.type === "continent")
    .sort(byListingsThenName)
    .map((continent) => ({
      ...toMenuItem(continent),
      countries: orderWithFeatured(childrenOf(continent, "country"), featured).map((country) => ({
        ...toMenuItem(country),
        cities: orderWithFeatured(childrenOf(country, "city"), featured).map(toMenuItem),
      })),
    }));

  return { continents };
};
