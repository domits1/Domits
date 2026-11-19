import { SITE_PROPERTIES_OVERRIDE_KEY, listOtherSitePropertyIds } from "./websiteSiteProperties.js";
import { toPublicWebsitePropertySnapshotView } from "../../util/websitePropertySnapshotView.js";
import { withinTimeLimit } from "../../util/timeLimit.js";

export const SITE_PROPERTY_LOAD_BATCH_SIZE = 4;
export const SITE_PROPERTY_READ_TIMEOUT_MS = 3000;
export const MAX_SITE_PROPERTY_SNAPSHOTS_BYTES = 768 * 1024;
const ACTIVE_PROPERTY_STATUS = "ACTIVE";

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const loadInBatches = async (items, load) => {
  const results = [];
  for (let start = 0; start < items.length; start += SITE_PROPERTY_LOAD_BATCH_SIZE) {
    results.push(...(await Promise.all(items.slice(start, start + SITE_PROPERTY_LOAD_BATCH_SIZE).map(load))));
  }
  return results;
};

export class WebsiteSitePropertySnapshots {
  constructor({ propertyService, siteRepository, pageSettings, readTimeoutMs = SITE_PROPERTY_READ_TIMEOUT_MS }) {
    this.propertyService = propertyService;
    this.siteRepository = siteRepository;
    this.pageSettings = pageSettings;
    this.readTimeoutMs = readTimeoutMs;
  }

  async listForPublish({ hostId, mainPropertyId, overrides }) {
    if (!isPlainObject(overrides) || !Object.hasOwn(overrides, SITE_PROPERTIES_OVERRIDE_KEY)) {
      return null;
    }
    if (!(await this.pageSettings.allowsSiteProperties(hostId))) {
      return null;
    }
    return listOtherSitePropertyIds(overrides, mainPropertyId);
  }

  async buildForPublish(propertyIds) {
    const snapshots = await loadInBatches(propertyIds, async (propertyId) => {
      const propertySnapshot = await this.propertyService.getFullPropertyAttributes(propertyId);
      if (!isPlainObject(propertySnapshot?.property)) {
        throw new TypeError("siteProperties lists a property whose listing data could not be loaded.");
      }
      return { propertyId, propertySnapshot };
    });

    if (Buffer.byteLength(JSON.stringify(snapshots)) > MAX_SITE_PROPERTY_SNAPSHOTS_BYTES) {
      throw new TypeError("siteProperties holds more listing data than one website can publish. Remove a property and publish again.");
    }
    return snapshots;
  }

  async serveForRender({ site, overrides }) {
    const list = isPlainObject(overrides) ? overrides[SITE_PROPERTIES_OVERRIDE_KEY] : undefined;
    if (!Array.isArray(list) || list.length < 2) {
      return [];
    }

    let published;
    try {
      published = await withinTimeLimit(
        this.readPublishedSiteProperties(site, listOtherSitePropertyIds(overrides, site.propertyId)),
        this.readTimeoutMs,
        () => new Error("The properties of the website did not load in time.")
      );
    } catch (error) {
      console.error(`[WebsiteSiteProperties] site ${site.id} shows its main property only: its other properties could not be read.`, error);
      return [];
    }

    const served = list.flatMap(({ propertyId, slug }) => {
      if (propertyId === site.propertyId) {
        return [{ propertyId, slug, isMainProperty: true }];
      }
      const propertySnapshot = published.snapshots.get(propertyId);
      const state = published.states.get(propertyId);
      const isServable =
        isPlainObject(propertySnapshot) && state?.hostId === site.hostId && state?.status === ACTIVE_PROPERTY_STATUS;
      return isServable
        ? [{ propertyId, slug, isMainProperty: false, propertySnapshot: toPublicWebsitePropertySnapshotView(propertySnapshot) }]
        : [];
    });
    return served.length < 2 ? [] : served;
  }

  async readPublishedSiteProperties(site, otherPropertyIds) {
    const [snapshots, states] = await Promise.all([
      this.siteRepository.getPublishedSitePropertySnapshots(site.id, site.staticPageRevision),
      this.siteRepository.getSitePropertyStates(otherPropertyIds),
    ]);
    return {
      snapshots: new Map(snapshots.map((entry) => [entry?.propertyId, entry?.propertySnapshot])),
      states: new Map(states.map((state) => [state.id, state])),
    };
  }
}
