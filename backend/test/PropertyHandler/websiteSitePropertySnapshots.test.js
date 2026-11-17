import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  MAX_SITE_PROPERTY_SNAPSHOTS_BYTES,
  SITE_PROPERTY_LOAD_BATCH_SIZE,
  WebsiteSitePropertySnapshots,
} from "../../functions/PropertyHandler/business/service/websiteSitePropertySnapshots.js";

const SITE = Object.freeze({ id: "site-1", hostId: "host-1", propertyId: "property-main", staticPageRevision: 7 });
const PUBLIC_LOCATION = { city: "Bergen", country: "Norway" };
const FULL_LOCATION = { ...PUBLIC_LOCATION, street: "Strandgata", houseNumber: "4", postalCode: "5013" };
const entry = (propertyId) => ({ propertyId, slug: propertyId.replace("property-", "") });
const listing = (propertyId) => ({
  property: { id: propertyId, hostId: "host-1", status: "ACTIVE", title: `Listing ${propertyId}` },
  images: [{ key: `${propertyId}.jpg` }],
  pricing: { roomRate: 120 },
  location: PUBLIC_LOCATION,
});
const activeState = (id) => ({ id, hostId: "host-1", status: "ACTIVE" });

const buildSnapshots = ({ listings = {}, snapshots = [], states = [], readTimeoutMs, allowed = true } = {}) => {
  const loadListing = (location) => async (propertyId) =>
    listings[propertyId] ? { ...listings[propertyId], location } : { property: null, images: [], pricing: null };
  const propertyService = {
    getFullPropertyAttributes: jest.fn(loadListing(PUBLIC_LOCATION)),
    getFullPropertyAttributesWithFullLocation: jest.fn(loadListing(FULL_LOCATION)),
  };
  const pageSettings = {
    allowsSiteProperties: jest.fn(async () => {
      if (allowed instanceof Error) throw allowed;
      return allowed;
    }),
  };
  const siteRepository = {
    getPublishedSitePropertySnapshots: jest.fn(async () => snapshots),
    getSitePropertyStates: jest.fn(async () => states),
  };
  const service = new WebsiteSitePropertySnapshots({ propertyService, siteRepository, pageSettings, readTimeoutMs });
  return { service, propertyService, siteRepository, pageSettings };
};

const listForPublish = (service, overrides) =>
  service.listForPublish({ hostId: SITE.hostId, mainPropertyId: SITE.propertyId, overrides });
const publish = async (service, overrides) => service.buildForPublish(await listForPublish(service, overrides));
const render = (service, list) => service.serveForRender({ site: SITE, overrides: { siteProperties: list } });

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("deciding which properties a publish snapshots", () => {
  it("lists every property but the main one for a host with the plan", async () => {
    const { service, pageSettings } = buildSnapshots();

    const propertyIds = await listForPublish(service, { siteProperties: [entry("property-3"), entry("property-main")] });

    expect(propertyIds).toEqual(["property-3"]);
    expect(pageSettings.allowsSiteProperties).toHaveBeenCalledWith("host-1");
  });

  it.each([
    ["overrides without a list", { heroTitle: "Villa" }],
    ["no overrides", undefined],
  ])("lists nothing and reads no plan for %s, so the publish stays as it is today", async (_label, overrides) => {
    const { service, pageSettings } = buildSnapshots();

    expect(await listForPublish(service, overrides)).toBeNull();
    expect(pageSettings.allowsSiteProperties).not.toHaveBeenCalled();
  });

  it("lists nothing for a host without the plan, even when the stored list is not valid any more", async () => {
    const { service } = buildSnapshots({ allowed: false });

    expect(await listForPublish(service, { siteProperties: [entry("property-2")] })).toBeNull();
  });

  it("fails the publish when the plan cannot be read, instead of publishing without the properties", async () => {
    const { service } = buildSnapshots({ allowed: new Error("The website plan read did not answer in time.") });

    await expect(listForPublish(service, { siteProperties: [entry("property-main")] })).rejects.toThrow("did not answer in time");
  });
});

describe("taking the snapshots of a website's properties at publish", () => {
  it("snapshots every property but the main one, in the host's order, without calendar availability or address", async () => {
    const listings = { "property-2": listing("property-2"), "property-3": listing("property-3") };
    const { service, propertyService } = buildSnapshots({ listings });

    const snapshots = await publish(service, {
      siteProperties: [entry("property-3"), entry("property-main"), entry("property-2")],
    });

    expect(snapshots).toEqual([
      { propertyId: "property-3", propertySnapshot: listings["property-3"] },
      { propertyId: "property-2", propertySnapshot: listings["property-2"] },
    ]);
    expect(propertyService.getFullPropertyAttributes.mock.calls).toEqual([["property-3"], ["property-2"]]);
    expect(propertyService.getFullPropertyAttributesWithFullLocation).not.toHaveBeenCalled();
    expect(snapshots[0].propertySnapshot.location).toEqual({ city: "Bergen", country: "Norway" });
  });

  it.each([
    ["an empty list", []],
    ["a list with only the main property", [entry("property-main")]],
  ])("writes an empty set for %s, so old snapshots are replaced", async (_label, list) => {
    const { service } = buildSnapshots();

    expect(await publish(service, { siteProperties: list })).toEqual([]);
  });

  it("refuses a property whose listing data cannot be loaded", async () => {
    const { service } = buildSnapshots();

    await expect(publish(service, { siteProperties: [entry("property-main"), entry("property-gone")] })).rejects.toThrow(
      "siteProperties lists a property whose listing data could not be loaded."
    );
  });

  it("refuses an invalid list instead of publishing part of it", async () => {
    const { service } = buildSnapshots();

    await expect(publish(service, { siteProperties: [entry("property-2")] })).rejects.toThrow(/must list the main property/);
  });

  it("refuses snapshots that would not fit in the site row", async () => {
    const large = { ...listing("property-2"), description: "x".repeat(MAX_SITE_PROPERTY_SNAPSHOTS_BYTES) };
    const { service } = buildSnapshots({ listings: { "property-2": large } });

    await expect(publish(service, { siteProperties: [entry("property-main"), entry("property-2")] })).rejects.toThrow(
      /^siteProperties holds more listing data than one website can publish/
    );
  });

  it(`loads at most ${SITE_PROPERTY_LOAD_BATCH_SIZE} properties at the same time`, async () => {
    let running = 0;
    let mostAtOnce = 0;
    const { service, propertyService } = buildSnapshots();
    propertyService.getFullPropertyAttributes.mockImplementation(async (propertyId) => {
      running += 1;
      mostAtOnce = Math.max(mostAtOnce, running);
      await new Promise((resolve) => setImmediate(resolve));
      running -= 1;
      return listing(propertyId);
    });
    const list = [entry("property-main"), ...Array.from({ length: 11 }, (_, index) => entry(`property-${index + 2}`))];

    expect(await publish(service, { siteProperties: list })).toHaveLength(11);
    expect(mostAtOnce).toBe(SITE_PROPERTY_LOAD_BATCH_SIZE);
  });
});

describe("serving the published properties of a website", () => {
  const published = (...ids) => ids.map((id) => ({ propertyId: id, propertySnapshot: listing(id) }));

  it("serves the published snapshots in the host's order, through the public view, without loading a listing", async () => {
    const { service, propertyService, siteRepository } = buildSnapshots({
      snapshots: published("property-2"),
      states: [activeState("property-2")],
    });

    const served = await render(service, [entry("property-2"), entry("property-main")]);

    expect(served).toEqual([
      {
        propertyId: "property-2",
        slug: "2",
        isMainProperty: false,
        propertySnapshot: {
          property: { id: "property-2", status: "ACTIVE", title: "Listing property-2" },
          images: [{ key: "property-2.jpg" }],
          pricing: { roomRate: 120 },
          location: { city: "Bergen", country: "Norway" },
        },
      },
      { propertyId: "property-main", slug: "main", isMainProperty: true },
    ]);
    expect(siteRepository.getPublishedSitePropertySnapshots).toHaveBeenCalledWith("site-1", 7);
    expect(siteRepository.getSitePropertyStates).toHaveBeenCalledWith(["property-2"]);
    expect(propertyService.getFullPropertyAttributesWithFullLocation).not.toHaveBeenCalled();
  });

  it.each([
    ["no list", undefined],
    ["only the main property", [entry("property-main")]],
  ])("reads nothing for %s", async (_label, list) => {
    const { service, siteRepository } = buildSnapshots();

    expect(await render(service, list)).toEqual([]);
    expect(siteRepository.getPublishedSitePropertySnapshots).not.toHaveBeenCalled();
    expect(siteRepository.getSitePropertyStates).not.toHaveBeenCalled();
  });

  it.each([
    ["was not in the last publish", published("property-3"), [activeState("property-2"), activeState("property-3")]],
    ["belongs to another host now", published("property-2", "property-3"), [{ ...activeState("property-2"), hostId: "host-2" }, activeState("property-3")]],
    ["is no longer active", published("property-2", "property-3"), [{ ...activeState("property-2"), status: "INACTIVE" }, activeState("property-3")]],
    ["was deleted", published("property-2", "property-3"), [activeState("property-3")]],
  ])("leaves out a property that %s", async (_label, snapshots, states) => {
    const { service } = buildSnapshots({ snapshots, states });

    const served = await render(service, [entry("property-main"), entry("property-2"), entry("property-3")]);

    expect(served.map(({ propertyId }) => propertyId)).toEqual(["property-main", "property-3"]);
  });

  it("serves no list when fewer than two properties are left, so the site shows one property", async () => {
    const { service } = buildSnapshots({
      snapshots: published("property-2"),
      states: [{ ...activeState("property-2"), status: "INACTIVE" }],
    });

    expect(await render(service, [entry("property-main"), entry("property-2")])).toEqual([]);
  });

  it("shows the main property only and logs once when the published properties cannot be read", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { service, siteRepository } = buildSnapshots({ states: [activeState("property-2")] });
    siteRepository.getPublishedSitePropertySnapshots.mockRejectedValue(new Error('column "published_site_properties_json" does not exist'));

    expect(await render(service, [entry("property-main"), entry("property-2")])).toEqual([]);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("shows the main property only when the reads do not answer within the time limit", async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { service, siteRepository } = buildSnapshots({ readTimeoutMs: 50 });
    siteRepository.getSitePropertyStates.mockReturnValue(new Promise(() => undefined));

    const pending = render(service, [entry("property-main"), entry("property-2")]);
    await jest.advanceTimersByTimeAsync(60);

    expect(await pending).toEqual([]);
  });

  it("shows the main property only when the stored list is not valid", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { service, siteRepository } = buildSnapshots();

    expect(await render(service, [entry("property-2"), entry("property-3")])).toEqual([]);
    expect(siteRepository.getPublishedSitePropertySnapshots).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledTimes(1);
  });
});
