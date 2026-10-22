import { describe, expect, it, jest } from "@jest/globals";
import HostPropertyRepository from "../../functions/.shared/homeAutomation/repositories/hostPropertyRepository.js";

const HOST = "host-1";
const PROPERTY = "property-1";

const repositoryWith = (query, options = { schema: "test" }) => {
  const getClient = jest.fn().mockResolvedValue({ options, query });
  return { repository: new HostPropertyRepository({ getClient }), getClient, query };
};

describe("HostPropertyRepository.findOwned", () => {
  it("returns the property when the host owns it", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([{ id: PROPERTY }]));

    await expect(repository.findOwned(HOST, PROPERTY)).resolves.toEqual({ id: PROPERTY });
  });

  it("returns null when no row matches, whether the property is missing or belongs to another host", async () => {
    const { repository } = repositoryWith(jest.fn().mockResolvedValue([]));

    await expect(repository.findOwned(HOST, PROPERTY)).resolves.toBeNull();
  });

  it("filters on the host id as well as the property id, in the connection's schema", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([]));

    await repository.findOwned(HOST, PROPERTY);

    const [sql, params] = query.mock.calls[0];
    expect(sql).toContain("FROM test.property");
    expect(sql).toMatch(/WHERE id = \$1 AND hostid = \$2/);
    expect(params).toEqual([PROPERTY, HOST]);
  });

  it("falls back to the main schema", async () => {
    const { repository, query } = repositoryWith(jest.fn().mockResolvedValue([]), {});

    await repository.findOwned(HOST, PROPERTY);

    expect(query.mock.calls[0][0]).toContain("FROM main.property");
  });

  it.each([
    ["an empty host id", ["", PROPERTY]],
    ["a blank host id", ["  ", PROPERTY]],
    ["a missing host id", [undefined, PROPERTY]],
    ["an empty property id", [HOST, ""]],
    ["a non-text property id", [HOST, 42]],
    ["a property id over 255 characters", [HOST, "p".repeat(256)]],
  ])("rejects %s before any query", async (_label, [userId, propertyId]) => {
    const { repository, getClient, query } = repositoryWith(jest.fn());

    await expect(repository.findOwned(userId, propertyId)).rejects.toThrow(Error);

    expect(getClient).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("lets a database error through, so a failure is never read as 'not owned'", async () => {
    const { repository } = repositoryWith(jest.fn().mockRejectedValue(new Error("connection lost")));

    await expect(repository.findOwned(HOST, PROPERTY)).rejects.toThrow("connection lost");
  });
});
