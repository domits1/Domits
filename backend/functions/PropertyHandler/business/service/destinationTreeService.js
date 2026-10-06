import { DestinationPageRepository } from "../../data/repository/destinationPageRepository.js";
import { isDestinationEligible, readDestinationSettings } from "../../util/destination/destinationSettings.js";
import { buildDestinationPage } from "./destinationPageBuilder.js";
import { buildDestinationSitemap } from "./destinationSitemapBuilder.js";

const byPath = (left, right) => left.path.localeCompare(right.path);

export const buildDestinationTree = (destinations, settings = readDestinationSettings()) => {
  const byId = new Map(destinations.map((destination) => [destination.id, { ...destination, children: [] }]));
  for (const destination of byId.values()) {
    if (destination.parentId && byId.has(destination.parentId)) {
      byId.get(destination.parentId).children.push(destination);
    }
  }

  const eligible = new Map();
  const decide = (destination) => {
    if (eligible.has(destination.id)) {
      return eligible.get(destination.id);
    }
    const eligibleChildren = destination.children.filter(decide).length;
    const totalListings =
      destination.children.reduce((sum, child) => sum + child.totalListings, 0) + destination.activeListings;
    destination.totalListings = totalListings;
    const decision = isDestinationEligible({ activeListings: totalListings, eligibleChildren }, settings);
    eligible.set(destination.id, decision);
    return decision;
  };
  for (const destination of byId.values()) {
    destination.totalListings = destination.activeListings;
  }
  for (const destination of [...byId.values()].sort((left, right) => right.path.length - left.path.length)) {
    decide(destination);
  }

  return [...byId.values()]
    .map((destination) => ({ ...destination, eligible: eligible.get(destination.id) === true }))
    .sort(byPath);
};

export class DestinationTreeService {
  constructor({
    destinationPageRepository = new DestinationPageRepository(),
    settings = readDestinationSettings(),
  } = {}) {
    this.destinationPageRepository = destinationPageRepository;
    this.settings = settings;
  }

  async listEligibleDestinations() {
    const destinations = await this.destinationPageRepository.listDestinationsWithActiveListings();
    return buildDestinationTree(destinations, this.settings).filter((destination) => destination.eligible);
  }

  async renderDestinationSitemap({ siteOrigin, lastModified = new Date() } = {}) {
    return buildDestinationSitemap(await this.listEligibleDestinations(), { siteOrigin, lastModified });
  }

  async renderDestinationPage(path, { siteOrigin } = {}) {
    const tree = buildDestinationTree(
      await this.destinationPageRepository.listDestinationsWithActiveListings(),
      this.settings
    );
    const destination = tree.find((candidate) => candidate.path === path);
    if (!destination || !destination.eligible) {
      return null;
    }

    const parents = [];
    let parentId = destination.parentId;
    while (parentId) {
      const parent = tree.find((candidate) => candidate.id === parentId);
      if (!parent) {
        break;
      }
      parents.unshift({ name: parent.name, path: parent.path });
      parentId = parent.parentId;
    }

    const listings = await this.destinationPageRepository.listActiveListingsUnderPath(path);
    return buildDestinationPage({
      destination: { type: destination.type, name: destination.name, path: destination.path },
      parents,
      children: destination.children
        .filter((child) => tree.find((candidate) => candidate.id === child.id)?.eligible)
        .map((child) => ({ name: child.name, path: child.path, activeListings: child.totalListings })),
      listings,
      activeListings: destination.totalListings,
      siteOrigin,
      settings: this.settings,
    });
  }
}

export default DestinationTreeService;
