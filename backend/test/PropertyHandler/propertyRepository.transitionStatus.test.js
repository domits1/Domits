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

describe("PropertyRepository.transitionStatus", () => {
  let repository;
  let updateChain;
  let client;

  const mockDatabase = ({ affected, archiveColumns = [] }) => {
    updateChain = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(affected === undefined ? undefined : { affected }),
    };
    client = {
      createQueryBuilder: jest.fn(() => updateChain),
      query: jest.fn(async (statement) =>
        statement.includes("information_schema") ? archiveColumns.map((column) => ({ column_name: column })) : []
      ),
    };
    Database.getInstance.mockResolvedValue(client);
  };

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    repository = new PropertyRepository({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("issues one conditional update on the id and the allowed current statuses", async () => {
    mockDatabase({ affected: 1 });

    await repository.transitionStatus("property-1", ["INACTIVE", "REJECTED"], "PENDING_REVIEW");

    expect(updateChain.execute).toHaveBeenCalledTimes(1);
    expect(updateChain.where).toHaveBeenCalledWith("id = :id AND status IN (:...fromStatuses)", {
      id: "property-1",
      fromStatuses: ["INACTIVE", "REJECTED"],
    });
  });

  it("sets the new status and updatedat in epoch milliseconds, and nothing else", async () => {
    mockDatabase({ affected: 1 });

    await repository.transitionStatus("property-1", ["PENDING_REVIEW"], "ACTIVE");

    expect(updateChain.set).toHaveBeenCalledWith({ status: "ACTIVE", updatedat: NOW });
  });

  it.each([
    [1, 1],
    [0, 0],
    [undefined, 0],
  ])("returns the affected row count: %s gives %s", async (affected, expected) => {
    mockDatabase({ affected });

    await expect(repository.transitionStatus("property-1", ["PENDING_REVIEW"], "ACTIVE")).resolves.toBe(expected);
  });

  it("refuses an empty from-status list instead of building invalid SQL", async () => {
    mockDatabase({ affected: 1 });

    await expect(repository.transitionStatus("property-1", [], "ACTIVE")).rejects.toBeInstanceOf(TypeError);
    expect(updateChain.execute).not.toHaveBeenCalled();
  });

  it("clears the archive metadata of a property that leaves ARCHIVED", async () => {
    mockDatabase({ affected: 1, archiveColumns: ["archivedat", "archivereason"] });

    await repository.transitionStatus("property-1", ["ARCHIVED"], "PENDING_REVIEW");

    expect(client.query).toHaveBeenLastCalledWith(
      "UPDATE property SET archivedat = NULL, archivereason = NULL WHERE id = $1",
      ["property-1"]
    );
  });

  it("does not touch archive metadata when no row was changed", async () => {
    mockDatabase({ affected: 0, archiveColumns: ["archivedat"] });

    await repository.transitionStatus("property-1", ["ARCHIVED"], "PENDING_REVIEW");

    expect(client.query).not.toHaveBeenCalled();
  });

  it("does not touch archive metadata when the property was not archived", async () => {
    mockDatabase({ affected: 1, archiveColumns: ["archivedat"] });

    await repository.transitionStatus("property-1", ["PENDING_REVIEW"], "ACTIVE");

    expect(client.query).not.toHaveBeenCalled();
  });

  it("skips the metadata update when the table has no archive columns", async () => {
    mockDatabase({ affected: 1, archiveColumns: [] });

    await repository.transitionStatus("property-1", ["ARCHIVED"], "PENDING_REVIEW");

    expect(client.query).toHaveBeenCalledTimes(1);
  });
});
