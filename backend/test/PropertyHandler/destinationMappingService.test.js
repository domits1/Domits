import { describe, expect, it, jest } from "@jest/globals";
import {
  DestinationMappingService,
  clampBatchSize,
} from "../../functions/PropertyHandler/business/service/destinationMappingService.js";

const MARBELLA = { propertyId: "property-1", country: "Spain", city: "Marbella" };

const buildService = ({
  written = true,
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
    removePropertyDestination: jest.fn(async () => true),
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
  it("reads the stored address and writes the chain with the exact stored text", async () => {
    const { service, repository } = buildService({
      locations: { "property-1": { propertyId: "property-1", country: " spain", city: "Marbella " } },
    });

    const result = await service.mapPropertyLocation(" property-1 ");

    expect(result).toEqual({
      propertyId: "property-1",
      outcome: "mapped",
      reason: null,
      path: "/destinations/europe/spain/marbella",
    });
    expect(repository.getLocationForMapping).toHaveBeenCalledWith("property-1");
    const [propertyId, chain, options] = repository.syncPropertyDestination.mock.calls[0];
    expect(propertyId).toBe("property-1");
    expect(chain.city.slug).toBe("marbella");
    expect(options).toEqual({ sourceCountry: " spain", sourceCity: "Marbella " });
    expect(repository.removePropertyDestination).not.toHaveBeenCalled();
  });

  it("removes the mapping only while the address is still the unknown one, instead of guessing", async () => {
    const { service, repository } = buildService({
      locations: { "property-1": { propertyId: "property-1", country: "Narnia", city: "Cair Paravel" } },
    });

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
  });

  it("maps a property whose city cannot be resolved to its country, and says so", async () => {
    const { service, repository } = buildService({
      locations: { "property-1": { propertyId: "property-1", country: "Spain", city: " - " } },
    });

    expect(await service.mapPropertyLocation("property-1")).toMatchObject({
      outcome: "mapped",
      reason: "empty_city",
      path: "/destinations/europe/spain",
    });
    const [, chain, options] = repository.syncPropertyDestination.mock.calls[0];
    expect(chain.city).toBeNull();
    expect(options).toEqual({ sourceCountry: "Spain", sourceCity: " - " });
  });

  it("leaves a property without a location row alone", async () => {
    const { service, repository } = buildService({ locations: {} });
    expect(await service.mapPropertyLocation("property-9")).toMatchObject({
      outcome: "unresolved",
      reason: "no_location",
    });
    expect(repository.removePropertyDestination).not.toHaveBeenCalled();
    expect(repository.syncPropertyDestination).not.toHaveBeenCalled();
  });

  it("reports a write that lost against a newer address as stale, and a thrown error as failed without throwing", async () => {
    const consoleError = silence();
    const stale = buildService({ written: false });
    expect(await stale.service.mapPropertyLocation("property-1")).toMatchObject({
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

  it("refuses to map without a property id", async () => {
    const { service } = buildService();
    await expect(service.mapPropertyLocation("")).rejects.toThrow("A property id is required");
  });
});

describe("the destination backfill", () => {
  it("walks the properties that need a mapping in batches, by cursor, and counts every outcome", async () => {
    const consoleError = silence();
    const { service, repository } = buildService({
      needing: [["p1", "p2", "p3"], ["p4"]],
      locations: {
        p1: { propertyId: "p1", country: "Spain", city: "Marbella" },
        p2: { propertyId: "p2", country: "Narnia", city: "x" },
        p4: { propertyId: "p4", country: "Italy", city: "Lucca" },
      },
      failures: { location: "p3" },
    });
    const seen = [];

    const summary = await service.backfill({ batchSize: 3, onProperty: (result) => seen.push(result.outcome) });

    expect(summary).toMatchObject({
      mapped: 2,
      unresolved: 1,
      stale: 0,
      failed: 1,
      batches: 2,
      complete: true,
      cursor: "p4",
    });
    expect(summary.failures).toEqual([{ propertyId: "p3", message: "connection refused" }]);
    expect(repository.listPropertyIdsNeedingMapping.mock.calls.map(([args]) => args)).toEqual([
      { after: "", limit: 3 },
      { after: "p3", limit: 3 },
    ]);
    expect(seen).toEqual(["mapped", "unresolved", "failed", "mapped"]);
    consoleError.mockRestore();
  });

  it("counts a property whose location row is gone as unresolved and a lost write as stale", async () => {
    const { service } = buildService({ written: false, needing: [["p1", "p2"]], locations: { p1: MARBELLA } });

    expect(await service.backfill({ batchSize: 10 })).toMatchObject({
      mapped: 0,
      stale: 1,
      unresolved: 1,
      failed: 0,
      complete: true,
    });
  });

  it("clamps the batch size to what the repository returns at most, so a short batch really means the end", async () => {
    const { service, repository } = buildService({ needing: [["p1"]], locations: { p1: MARBELLA } });

    expect(await service.backfill({ batchSize: 1000 })).toMatchObject({ mapped: 1, complete: true });
    expect(repository.listPropertyIdsNeedingMapping).toHaveBeenCalledWith({ after: "", limit: 500 });
    expect([clampBatchSize(0), clampBatchSize("x"), clampBatchSize(7), clampBatchSize(1000)]).toEqual([
      100, 100, 7, 500,
    ]);
  });

  it("stops at the batch limit, says the run is not complete, and hands out the cursor a rerun continues from", async () => {
    const location = { propertyId: "x", country: "Spain", city: "Marbella" };
    const { service, repository } = buildService({
      needing: [["p1"], ["p2"], ["p3"]],
      locations: { p1: location, p2: location, p3: location },
    });

    const summary = await service.backfill({ batchSize: 1, maxBatches: 2 });

    expect(summary).toMatchObject({ mapped: 2, batches: 2, complete: false, cursor: "p2" });
    expect(repository.listPropertyIdsNeedingMapping).toHaveBeenCalledTimes(2);

    const rerun = buildService({ needing: [["p3"]], locations: { p3: location } });
    expect(await rerun.service.backfill({ batchSize: 1, after: "p2" })).toMatchObject({ mapped: 1, complete: true });
    expect(rerun.repository.listPropertyIdsNeedingMapping.mock.calls[0][0]).toEqual({ after: "p2", limit: 1 });
  });

  it("does nothing on a rerun when every mapping is current", async () => {
    const { service, repository } = buildService({ needing: [[]] });

    expect(await service.backfill()).toEqual({
      mapped: 0,
      unresolved: 0,
      stale: 0,
      failed: 0,
      batches: 0,
      complete: true,
      cursor: "",
      failures: [],
    });
    expect(repository.getLocationForMapping).not.toHaveBeenCalled();
  });
});
