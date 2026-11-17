import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PropertyRepository } from "../../functions/PropertyHandler/data/repository/propertyRepository.js";
import Database from "../../ORM/index.js";

jest.mock("../../ORM/index.js", () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const NOW = 1_800_000_000_000;
const ALL_COLUMNS = ["archivedat", "archivedby", "archivereason"];

describe("PropertyRepository archive metadata schema", () => {
  let repository;
  let client;

  const mockClient = (options) => {
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    client = {
      options,
      createQueryBuilder: jest.fn(() => updateChain),
      query: jest.fn(async (statement) =>
        statement.includes("information_schema") ? ALL_COLUMNS.map((column) => ({ column_name: column })) : []
      ),
    };
    Database.getInstance.mockResolvedValue(client);
  };

  beforeEach(() => {
    process.env.TEST = "false";
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    repository = new PropertyRepository({});
  });

  afterEach(() => {
    process.env.TEST = "true";
    jest.restoreAllMocks();
    Database.getInstance.mockReset();
  });

  it("qualifies the clearing update with the client schema and filters the columns on it", async () => {
    mockClient({ schema: "main" });

    await repository.transitionStatus("property-1", ["ARCHIVED"], "PENDING_REVIEW");

    expect(client.query).toHaveBeenNthCalledWith(1, expect.stringContaining("table_schema = $1"), ["main"]);
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE "main"."property" SET archivedat = NULL, archivedby = NULL, archivereason = NULL WHERE id = $1',
      ["property-1"]
    );
  });

  it("uses the test schema whenever TEST is true, whatever the client says", async () => {
    process.env.TEST = "true";
    mockClient({ schema: "main" });

    await repository.transitionStatus("property-1", ["ARCHIVED"], "PENDING_REVIEW");

    expect(client.query).toHaveBeenNthCalledWith(1, expect.any(String), ["test"]);
    expect(client.query.mock.calls[1][0]).toContain('"test"."property"');
  });

  it.each([
    ["public", "main"],
    ["MAIN", "main"],
    ["Staging_2", "staging_2"],
    [undefined, "main"],
    ["main; DROP TABLE property", "main"],
    ["1main", "main"],
    ["", "main"],
  ])("resolves client schema %p to %p", async (configured, expected) => {
    mockClient(configured === undefined ? undefined : { schema: configured });

    await repository.transitionStatus("property-1", ["ARCHIVED"], "PENDING_REVIEW");

    expect(client.query).toHaveBeenNthCalledWith(1, expect.any(String), [expected]);
    expect(client.query.mock.calls[1][0]).toContain(`"${expected}"."property"`);
  });

  it("writes the archive metadata to the qualified table when a property is archived", async () => {
    mockClient({ schema: "main" });

    await repository.updatePropertyStatus("property-1", "ARCHIVED", {
      archivedBy: "host-1",
      archiveReason: "has-bookings",
    });

    expect(client.query).toHaveBeenNthCalledWith(1, expect.stringContaining("table_schema = $1"), ["main"]);
    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE "main"."property" SET archivedat = $1, archivedby = $2, archivereason = $3 WHERE id = $4',
      [NOW, "host-1", "has-bookings", "property-1"]
    );
  });

  it("clears the archive metadata on the qualified table when a property leaves ARCHIVED", async () => {
    mockClient({ schema: "main" });

    await repository.updatePropertyStatus("property-1", "INACTIVE");

    expect(client.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE "main"."property" SET archivedat = NULL, archivedby = NULL, archivereason = NULL WHERE id = $1',
      ["property-1"]
    );
  });
});
