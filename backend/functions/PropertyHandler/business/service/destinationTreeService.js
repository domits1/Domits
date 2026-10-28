import { DestinationPageRepository } from "../../data/repository/destinationPageRepository.js";
import { isDestinationEligible, readDestinationSettings } from "../../util/destination/destinationSettings.js";
import { flagDestinationCity } from "../../util/destination/destinationFlags.js";
import { DESTINATIONS_ROOT_PATH, buildDestinationPage, buildDestinationRootPage } from "./destinationPageBuilder.js";
import { buildDestinationSitemap } from "./destinationSitemapBuilder.js";
import { createExpiringRead } from "../../util/expiringRead.js";
import { readDestinationRequestPath } from "./destinationPageRequest.js";

const byPath = (left, right) => left.path.localeCompare(right.path);

export const DESTINATION_PAGE_LISTING_LIMIT = 24;
export const DESTINATION_TREE_TTL_MS = 60000;
export const DESTINATION_TREE_READ_TIMEOUT_MS = 5000;

export const buildDestinationTree = (destinations, settings = readDestinationSettings()) => {
  const byId = new Map(destinations.map((destination) => [destination.id, { ...destination, children: [] }]));
  for (const destination of byId.values()) {
    if (destination.parentId && byId.has(destination.parentId)) {
      byId.get(destination.parentId).children.push(destination);
    }
  }

  const eligible = new Map();
  const deciding = new Set();
  const decide = (destination) => {
    if (eligible.has(destination.id)) {
      return eligible.get(destination.id);
    }
    if (deciding.has(destination.id)) {
      throw new Error(`The destination tree has a cycle at ${destination.path}.`);
    }
    deciding.add(destination.id);
    const eligibleChildren = destination.children.filter(decide).length;
    destination.totalListings =
      destination.children.reduce((sum, child) => sum + child.totalListings, 0) + destination.activeListings;
    const flags =
      destination.type === "city"
        ? flagDestinationCity({
            slug: destination.slug,
            countrySlug: byId.get(destination.parentId)?.slug,
            variants: [{ raw: destination.name }],
          })
        : [];
    const decision =
      flags.length === 0 &&
      isDestinationEligible(
        { activeListings: destination.totalListings, directListings: destination.activeListings, eligibleChildren },
        settings
      );
    eligible.set(destination.id, decision);
    deciding.delete(destination.id);
    return decision;
  };
  for (const destination of byId.values()) {
    decide(destination);
  }

  return [...byId.values()]
    .map((destination) => ({ ...destination, eligible: eligible.get(destination.id) === true }))
    .sort(byPath);
};

const hasPageBelow = (tree, parent) =>
  tree.some(
    (destination) => destination.parentId === parent.id && (destination.eligible || hasPageBelow(tree, destination))
  );

const buildRootContinents = (tree) =>
  tree
    .filter((destination) => destination.type === "continent")
    .map((continent) => ({
      name: continent.name,
      path: continent.path,
      hasPage: continent.eligible,
      countries: tree
        .filter(
          (destination) =>
            destination.type === "country" &&
            destination.parentId === continent.id &&
            (destination.eligible || hasPageBelow(tree, destination))
        )
        .map((country) => ({
          name: country.name,
          path: country.path,
          hasPage: country.eligible,
          activeListings: country.totalListings,
        })),
    }))
    .filter((continent) => continent.hasPage || continent.countries.length > 0);

export class DestinationTreeService {
  constructor({
    destinationPageRepository = new DestinationPageRepository(),
    settings = readDestinationSettings(),
    now = () => Date.now(),
  } = {}) {
    this.destinationPageRepository = destinationPageRepository;
    this.settings = settings;
    this.readTree = createExpiringRead({
      read: async () =>
        buildDestinationTree(await this.destinationPageRepository.listDestinationsWithActiveListings(), this.settings),
      ttlMs: DESTINATION_TREE_TTL_MS,
      timeoutMs: DESTINATION_TREE_READ_TIMEOUT_MS,
      now,
    });
  }

  async listEligibleDestinations() {
    return (await this.readTree()).filter((destination) => destination.eligible);
  }

  async renderDestinationSitemap({ siteOrigin, lastModified } = {}) {
    const tree = await this.readTree();
    const root = buildRootContinents(tree).length > 0 ? [{ path: DESTINATIONS_ROOT_PATH }] : [];
    const destinations = tree.filter(
      (destination) => destination.eligible && readDestinationRequestPath(destination.path).kind === "page"
    );
    return buildDestinationSitemap([...root, ...destinations], { siteOrigin, lastModified });
  }

  async renderDestinationPage(path, { siteOrigin } = {}) {
    const tree = await this.readTree();
    if (path === DESTINATIONS_ROOT_PATH) {
      return buildDestinationRootPage({ continents: buildRootContinents(tree), siteOrigin });
    }
    const destination = tree.find((candidate) => candidate.path === path);
    if (!destination?.eligible) {
      return null;
    }

    const parents = [];
    let parentId = destination.parentId;
    while (parentId) {
      const parent = tree.find((candidate) => candidate.id === parentId);
      if (!parent) {
        break;
      }
      if (parent.eligible) {
        parents.unshift({ name: parent.name, path: parent.path });
      }
      parentId = parent.parentId;
    }

    const listings = await this.destinationPageRepository.listActiveListingsUnderPath(
      path,
      DESTINATION_PAGE_LISTING_LIMIT
    );
    if (listings.length === 0) {
      return null;
    }
    return buildDestinationPage({
      destination: { type: destination.type, name: destination.name, path: destination.path },
      parents,
      children: destination.children
        .filter((child) => tree.find((candidate) => candidate.id === child.id)?.eligible)
        .map((child) => ({ name: child.name, path: child.path, activeListings: child.totalListings })),
      listings,
      activeListings: destination.totalListings,
      directListings: destination.activeListings,
      siteOrigin,
      settings: this.settings,
    });
  }
}

export default DestinationTreeService;
