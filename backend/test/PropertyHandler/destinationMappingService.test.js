import { describe, expect, it, jest } from "@jest/globals";
import {
  DestinationMappingService,
  clampBatchSize,
} from "../../functions/PropertyHandler/business/service/destinationMappingService.js";

const MARBELLA = { propertyId: "property-1", country: "Spain", city: "Marbella" };
const at = (country, city) => ({ propertyId: "property-1", country, city });

const buildService = ({
  written = true,
  current = true,
  locations = { "property-1": MARBELLA },
  needing = [[]],
  failures = {},
} = {}) => {
  const batches = [...needing];
  const repository = {
    syncPropertyDestination: jest.fn(async () => {
      if (failures.sync) throw new Error(failures.sync);
      return written;
    }),
    removePropertyDestination: jest.fn(async () => ({ removed: current, current })),
    getLocationForMapping: jest.fn(async (propertyId) => {
      if (failures.location === propertyId) throw new Error("connection refused");
      return locations[propertyId] === undefined ? null : locations[propertyId];
    }),
    listPropertyIdsNeedingMapping: jest.fn(async () => batches.shift() || []),
  };
  return { service: new DestinationMappingService({ destinationRepository: repository }), repository };
};

const silence = () => jest.spyOn(console, "error").mockImplementation(() => {});

describe("mapping a property to its destination", () => {
  it("reads the stored address by property id and writes the chain with the exact stored text", async () => {
    const { service, repository } = buildService({ locations: { "property-1": at(" spain", "Marbella ") } });

    const result = await service.mapPropertyLocation(" property-1 ");

    expect(result).toEqual({
      propertyId: "property-1",
      outcome: "mapped",
      reason: null,
      path: "/destinations/europe/spain/marbella",
    });
    expect(repository.getLocationForMapping).toHaveBeenCalledWith("property-1");
    const [propertyId, chain, options] = repository.syncPropertyDestination.mock.calls[0];
    expect([propertyId, chain.city.slug, options]).toEqual([
      "property-1",
      "marbella",
      { sourceCountry: " spain", sourceCity: "Marbella " },
    ]);
    expect(repository.removePropertyDestination).not.toHaveBeenCalled();
    await expect(service.mapPropertyLocation("")).rejects.toThrow("A property id is required");
  });

  it("removes the mapping only while the address is still the unknown one, and reports a moved address as stale", async () => {
    const { service, repository } = buildService({ locations: { "property-1": at("Narnia", "Cair Paravel") } });

    expect(await service.mapPropertyLocation("property-1")).toMatchObject({
      outcome: "unresolved",
      reason: "unknown_country",
      path: null,
    });
    expect(repository.removePropertyDestination).toHaveBeenCalledWith("property-1", {
      sourceCountry: "Narnia",
      sourceCity: "Cair Paravel",
    });
    expect(repository.syncPropertyDestination).not.toHaveBeenCalled();

    const moved = buildService({ current: false, locations: { "property-1": at("Narnia", "Cair Paravel") } });
    expect(await moved.service.mapPropertyLocation("property-1")).toMatchObject({
      outcome: "stale",
      reason: "location_changed",
    });
  });

  it("maps a property whose city cannot be resolved to its country, and says so", async () => {
    const { service, repository } = buildService({ locations: { "property-1": at("Spain", " - ") } });

    expect(await service.mapPropertyLocation("property-1")).toMatchObject({
      outcome: "mapped",
      reason: "empty_city",
      path: "/destinations/europe/spain",
    });
    const [, chain, options] = repository.syncPropertyDestination.mock.calls[0];
    expect(chain.city).toBeNull();
    expect(options).toEqual({ sourceCountry: "Spain", sourceCity: " - " });
  });

  it("reports a write that lost against a newer address as stale, and a thrown error as failed without throwing", async () => {
    const consoleError = silence();
    expect(await buildService({ written: false }).service.mapPropertyLocation("property-1")).toMatchObject({
      outcome: "stale",
      reason: "location_changed",
    });
    const failing = buildService({ failures: { sync: "deadlock" } });
    await expect(failing.service.mapPropertyLocation("property-1")).rejects.toThrow("deadlock");
    expect(await failing.service.mapPropertyLocationSafely("property-1")).toEqual({
      propertyId: "property-1",
      outcome: "failed",
      reason: "deadlock",
      path: null,
    });
    expect(consoleError).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});

describe("the destination backfill", () => {
  it("walks the properties that need a mapping in batches, by cursor, and counts every outcome including a missing location row", async () => {
    const consoleError = silence();
    const { service, repository } = buildService({
      needing: [
        ["p1", "p2", "p3"],
        ["p4", "p5"],
      ],
      locations: { p1: at("Spain", "Marbella"), p2: at("Narnia", "x"), p4: at("Italy", "Lucca") },
      failures: { location: "p3" },
    });
    const seen = [];

    const summary = await service.backfill({ batchSize: 3, onProperty: (result) => seen.push(result.outcome) });

    expect(summary).toMatchObject({
      mapped: 2,
      unresolved: 2,
      stale: 0,
      failed: 1,
      batches: 2,
      complete: true,
      cursor: "p5",
    });
    expect(summary.failures).toEqual([{ propertyId: "p3", message: "connection refused" }]);
    expect(repository.listPropertyIdsNeedingMapping.mock.calls.map(([args]) => args)).toEqual([
      { after: "", limit: 3 },
      { after: "p3", limit: 3 },
    ]);
    expect(seen).toEqual(["mapped", "unresolved", "failed", "mapped", "unresolved"]);
    consoleError.mockRestore();
  });

  it("clamps the batch size to what the repository returns at most, and asks nothing more when the first batch is empty", async () => {
    const { service, repository } = buildService({ needing: [["p1"]], locations: { p1: MARBELLA } });

    expect(await service.backfill({ batchSize: 1000 })).toMatchObject({ mapped: 1, complete: true });
    expect(repository.listPropertyIdsNeedingMapping).toHaveBeenCalledWith({ after: "", limit: 500 });
    expect([clampBatchSize(0), clampBatchSize("x"), clampBatchSize(7), clampBatchSize(1000)]).toEqual([
      100, 100, 7, 500,
    ]);

    const empty = buildService({ needing: [[]] });
    expect(await empty.service.backfill()).toMatchObject({
      mapped: 0,
      batches: 0,
      complete: true,
      cursor: "",
      failures: [],
    });
    expect(empty.repository.getLocationForMapping).not.toHaveBeenCalled();
  });

  it("stops at the batch limit, says the run is not complete, and hands out the cursor a rerun continues from", async () => {
    const { service, repository } = buildService({
      needing: [["p1"], ["p2"], ["p3"]],
      locations: { p1: MARBELLA, p2: MARBELLA, p3: MARBELLA },
    });

    expect(await service.backfill({ batchSize: 1, maxBatches: 2 })).toMatchObject({
      mapped: 2,
      batches: 2,
      complete: false,
      cursor: "p2",
    });
    expect(repository.listPropertyIdsNeedingMapping).toHaveBeenCalledTimes(2);

    const rerun = buildService({ needing: [["p3"]], locations: { p3: MARBELLA } });
    expect(await rerun.service.backfill({ batchSize: 1, after: "p2" })).toMatchObject({ mapped: 1, complete: true });
    expect(rerun.repository.listPropertyIdsNeedingMapping.mock.calls[0][0]).toEqual({ after: "p2", limit: 1 });
  });
});
