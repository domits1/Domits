import { describe, expect, it, jest } from "@jest/globals";
import { DestinationMappingService } from "../../functions/PropertyHandler/business/service/destinationMappingService.js";

const buildService = ({ written = true, locations = {}, needing = [[]], failures = {} } = {}) => {
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
  it("resolves the location and writes the chain with the exact source text", async () => {
    const { service, repository } = buildService();

    const result = await service.mapPropertyLocation(" property-1 ", { country: "Spain", city: "Marbella" });

    expect(result).toEqual({
      propertyId: "property-1",
      outcome: "mapped",
      reason: null,
      path: "/destinations/europe/spain/marbella",
    });
    const [propertyId, chain, options] = repository.syncPropertyDestination.mock.calls[0];
    expect(propertyId).toBe("property-1");
    expect(chain.city.slug).toBe("marbella");
    expect(options).toEqual({ sourceCountry: "Spain", sourceCity: "Marbella" });
    expect(repository.removePropertyDestination).not.toHaveBeenCalled();
  });

  it("removes the mapping instead of guessing when the country is unknown", async () => {
    const { service, repository } = buildService();

    expect(await service.mapPropertyLocation("property-1", { country: "Narnia", city: "Cair Paravel" })).toEqual({
      propertyId: "property-1",
      outcome: "unresolved",
      reason: "unknown_country",
      path: null,
    });
    expect(repository.removePropertyDestination).toHaveBeenCalledTimes(1);
    expect(repository.syncPropertyDestination).not.toHaveBeenCalled();
  });

  it("maps a property whose city cannot be resolved to its country, and says so", async () => {
    const { service, repository } = buildService();

    const result = await service.mapPropertyLocation("property-1", { country: "Spain", city: " - " });

    expect(result).toEqual({
      propertyId: "property-1",
      outcome: "mapped",
      reason: "empty_city",
      path: "/destinations/europe/spain",
    });
    const [, chain, options] = repository.syncPropertyDestination.mock.calls[0];
    expect(chain.city).toBeNull();
    expect(options).toEqual({ sourceCountry: "Spain", sourceCity: " - " });
    expect(repository.removePropertyDestination).not.toHaveBeenCalled();
  });

  it("reports a write that lost against a newer address as stale, and a thrown error as failed without throwing", async () => {
    const consoleError = silence();
    const stale = buildService({ written: false });
    expect(await stale.service.mapPropertyLocation("property-1", { country: "Spain", city: "Marbella" })).toMatchObject(
      { outcome: "stale", reason: "location_changed" }
    );

    const failing = buildService({ failures: { sync: "deadlock" } });
    await expect(
      failing.service.mapPropertyLocation("property-1", { country: "Spain", city: "Marbella" })
    ).rejects.toThrow("deadlock");
    expect(
      await failing.service.mapPropertyLocationSafely("property-1", { country: "Spain", city: "Marbella" })
    ).toEqual({
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
    await expect(service.mapPropertyLocation("", { country: "Spain", city: "Marbella" })).rejects.toThrow(
      "A property id is required"
    );
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

    expect(summary).toEqual({
      mapped: 2,
      unresolved: 1,
      stale: 0,
      failed: 1,
      batches: 2,
      complete: true,
      failures: [{ propertyId: "p3", message: "connection refused" }],
    });
    expect(repository.listPropertyIdsNeedingMapping.mock.calls.map(([args]) => args)).toEqual([
      { after: "", limit: 3 },
      { after: "p3", limit: 3 },
    ]);
    expect(seen).toEqual(["mapped", "unresolved", "mapped"]);
    consoleError.mockRestore();
  });

  it("counts a property whose location row is gone as unresolved and a lost write as stale", async () => {
    const { service } = buildService({
      written: false,
      needing: [["p1", "p2"]],
      locations: { p1: { propertyId: "p1", country: "Spain", city: "Marbella" } },
    });

    expect(await service.backfill({ batchSize: 10 })).toMatchObject({
      mapped: 0,
      stale: 1,
      unresolved: 1,
      failed: 0,
      complete: true,
    });
  });

  it("stops at the batch limit and says the run is not complete, so a rerun picks up where it left", async () => {
    const { service, repository } = buildService({
      needing: [["p1"], ["p2"], ["p3"]],
      locations: {
        p1: { country: "Spain", city: "Marbella" },
        p2: { country: "Spain", city: "Marbella" },
        p3: { country: "Spain", city: "Marbella" },
      },
    });

    const summary = await service.backfill({ batchSize: 1, maxBatches: 2 });

    expect(summary).toMatchObject({ mapped: 2, batches: 2, complete: false });
    expect(repository.listPropertyIdsNeedingMapping).toHaveBeenCalledTimes(2);
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
      failures: [],
    });
    expect(repository.getLocationForMapping).not.toHaveBeenCalled();
  });
});
