import { describe, expect, it, jest } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RefusedError,
  TARGET_HINT,
  assertTestSchema,
  describeTarget,
  formatTarget,
  read,
  requireConfirmedTarget,
  write,
} from "../../events/PropertyHandler/smokeSafety.js";

const HOST = "abc123.dsql.eu-west-2.on.aws";
const target = (overrides = {}) => ({
  host: HOST,
  database: "postgres",
  schema: "test",
  region: "eu-west-2",
  awsProfile: "Domits-Developer",
  ...overrides,
});
const argv = (...extra) => ["node", "listingOrderSmoke.js", "seed", ...extra];

describe("smoke script write safety", () => {
  describe("requireConfirmedTarget", () => {
    it("refuses a write when the --target flag is missing", () => {
      expect(() => requireConfirmedTarget(target(), argv())).toThrow(RefusedError);
    });

    it("refuses a write when the host does not match", () => {
      expect(() => requireConfirmedTarget(target(), argv("--target=other.dsql.eu-west-2.on.aws"))).toThrow(
        RefusedError
      );
    });

    it("allows the write when the exact host is typed back", () => {
      expect(() => requireConfirmedTarget(target(), argv(`--target=${HOST}`))).not.toThrow();
    });

    it.each([
      ["a longer host that starts with it", `${HOST}.evil`],
      ["a prefix of it", HOST.slice(0, -3)],
      ["a different case", HOST.toUpperCase()],
      ["an empty value", ""],
    ])("refuses %s", (_name, given) => {
      expect(() => requireConfirmedTarget(target(), argv(`--target=${given}`))).toThrow(RefusedError);
    });

    it("refuses when the connection reports no host, even with no flag to compare", () => {
      expect(() => requireConfirmedTarget(target({ host: undefined }), argv())).toThrow(RefusedError);
      expect(() => requireConfirmedTarget(target({ host: "" }), argv("--target="))).toThrow(RefusedError);
    });

    it("finds the flag wherever it sits among the other arguments, such as --yes", () => {
      expect(() => requireConfirmedTarget(target(), argv("--yes", `--target=${HOST}`))).not.toThrow();
      expect(() => requireConfirmedTarget(target(), argv(`--target=${HOST}`, "--yes"))).not.toThrow();
      expect(() => requireConfirmedTarget(target(), argv("--yes"))).toThrow(RefusedError);
    });

    it("shows a placeholder in the hint and never the real host, so it cannot be pasted blindly", () => {
      let message;
      try {
        requireConfirmedTarget(target(), argv());
      } catch (error) {
        message = error.message;
      }

      expect(message).toContain(TARGET_HINT);
      expect(message).not.toContain(HOST);
    });

    it("says what was passed when the host is wrong, still without revealing the real host", () => {
      let message;
      try {
        requireConfirmedTarget(target(), argv("--target=other-host"));
      } catch (error) {
        message = error.message;
      }

      expect(message).toContain("You passed --target=other-host");
      expect(message).not.toContain(HOST);
    });
  });

  describe("assertTestSchema", () => {
    it("allows the test schema", () => {
      expect(() => assertTestSchema(target({ schema: "test" }))).not.toThrow();
    });

    it.each(["main", "public", "Test", "", undefined])("refuses the schema %p", (schema) => {
      expect(() => assertTestSchema(target({ schema }))).toThrow(RefusedError);
    });

    it("names the schema it refused", () => {
      expect(() => assertTestSchema(target({ schema: "main" }))).toThrow('"main"');
    });
  });

  describe("RefusedError", () => {
    it("is told apart from any other error, so only refusals are reduced to a message", () => {
      const refusal = new RefusedError("no");

      expect(refusal).toBeInstanceOf(Error);
      expect(refusal).toBeInstanceOf(RefusedError);
      expect(refusal.name).toBe("RefusedError");
      expect(new TypeError("bug")).not.toBeInstanceOf(RefusedError);
    });
  });

  describe("target description", () => {
    it("reads the host, database and schema from the data source and adds the region and profile", () => {
      const client = { options: { host: HOST, database: "postgres", schema: "test" } };

      expect(describeTarget(client, "eu-west-2", "Domits-Developer")).toEqual(target());
    });

    it("prints every field the person needs to recognise the cluster", () => {
      const line = formatTarget(target());

      for (const part of [HOST, "postgres", "test", "eu-west-2", "Domits-Developer"]) {
        expect(line).toContain(part);
      }
    });
  });
});

describe("guarded SQL", () => {
  const fakeClient = (result = [{ n: 1 }]) => ({ query: jest.fn().mockResolvedValue(result) });
  const INSERT = "INSERT INTO test.property (id) VALUES ($1)";

  describe("write", () => {
    it("refuses without confirmation, and never reaches the client", async () => {
      const client = fakeClient();

      await expect(write(target(), argv(), client, INSERT, ["a"])).rejects.toThrow(RefusedError);
      expect(client.query).not.toHaveBeenCalled();
    });

    it("refuses a wrong host, and never reaches the client", async () => {
      const client = fakeClient();

      await expect(write(target(), argv("--target=other-host"), client, INSERT, ["a"])).rejects.toThrow(RefusedError);
      expect(client.query).not.toHaveBeenCalled();
    });

    it("refuses when the connection reports no host, and never reaches the client", async () => {
      const client = fakeClient();

      await expect(write(target({ host: undefined }), argv(), client, INSERT, ["a"])).rejects.toThrow(RefusedError);
      expect(client.query).not.toHaveBeenCalled();
    });

    it("runs the statement with its parameters once the host is confirmed, and returns the result", async () => {
      const client = fakeClient([{ affected: 1 }]);

      const result = await write(target(), argv(`--target=${HOST}`), client, INSERT, ["a"]);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(INSERT, ["a"]);
      expect(result).toEqual([{ affected: 1 }]);
    });

    it("lets a database error through, so a failed write is not mistaken for success", async () => {
      const client = { query: jest.fn().mockRejectedValue(new Error("connection lost")) };

      await expect(write(target(), argv(`--target=${HOST}`), client, INSERT, [])).rejects.toThrow("connection lost");
    });
  });

  describe("read", () => {
    it.each([
      ["a plain select", "SELECT COUNT(*) FROM test.property"],
      ["lower case", "select 1"],
      ["leading whitespace and a newline", "  \n SELECT id\nFROM test.property"],
      ["a trailing semicolon", "SELECT 1;"],
    ])("allows %s, with no confirmation needed", async (_name, sql) => {
      const client = fakeClient();

      await expect(read(client, sql, ["p"])).resolves.toEqual([{ n: 1 }]);
      expect(client.query).toHaveBeenCalledWith(sql, ["p"]);
    });

    it.each([
      ["an insert", INSERT],
      ["a delete", "DELETE FROM test.property WHERE id LIKE $1"],
      ["an update", "UPDATE test.property SET status = 'X'"],
      ["a drop", "DROP TABLE test.property"],
      ["a data-changing CTE that ends in a select", "WITH gone AS (DELETE FROM test.property RETURNING id) SELECT id FROM gone"],
      ["a select followed by a second statement", "SELECT 1; DELETE FROM test.property"],
      ["a select into, which creates a table", "SELECT * INTO test.copy_of_property FROM test.property"],
      ["a select into in lower case", "select * into test.copy_of_property from test.property"],
      ["a select into with the keyword on its own line", "SELECT *\n  INTO test.copy_of_property\n  FROM test.property"],
      ["a locking read, for update", "SELECT id FROM test.property FOR UPDATE"],
      ["a locking read in lower case", "select id from test.property for update"],
      ["a locking read, for share", "SELECT id FROM test.property FOR SHARE"],
      ["a locking read, for no key update", "SELECT id FROM test.property FOR NO KEY UPDATE"],
      ["a locking read, for key share", "SELECT id FROM test.property FOR KEY SHARE"],
      ["a locking read with extra whitespace", "SELECT id FROM test.property FOR   \n UPDATE"],
      ["an empty statement", ""],
      ["something that is not text", undefined],
    ])("refuses %s, and never reaches the client", async (_name, sql) => {
      const client = fakeClient();

      await expect(read(client, sql, [])).rejects.toThrow(RefusedError);
      expect(client.query).not.toHaveBeenCalled();
    });

    it.each([
      ["a trailing comment", "SELECT 1 -- harmless comment"],
      ["a column whose name only contains the letters of into", "SELECT printout FROM test.property"],
      ["a column whose name only contains the letters of for", "SELECT therefore FROM test.property"],
      ["a word that ends in for, followed by update", "SELECT id FROM test.property WHERE note = 'therefor update'"],
    ])("still allows %s", async (_name, sql) => {
      const client = fakeClient();

      await expect(read(client, sql, [])).resolves.toEqual([{ n: 1 }]);
      expect(client.query).toHaveBeenCalledWith(sql, []);
    });

    // KNOWN, ACCEPTED GAP. These pass because read() reads the shape of a statement, and a function called from inside
    // a SELECT cannot be seen from its text. The guard is not what protects against them: what this script puts
    // in its read() calls is. If a future change makes read() refuse these, update these tests on purpose.
    it.each([
      ["setval, which changes a sequence", "SELECT setval('some_sequence', 1)"],
      ["pg_terminate_backend, which ends a session", "SELECT pg_terminate_backend(123)"],
    ])("does not detect a side effect hidden in a function call: %s", async (_name, sql) => {
      const client = fakeClient();

      await expect(read(client, sql, [])).resolves.toEqual([{ n: 1 }]);
      expect(client.query).toHaveBeenCalledWith(sql, []);
    });
  });

  describe("the smoke script", () => {
    const SCRIPT = readFileSync(join(process.cwd(), "events", "PropertyHandler", "listingOrderSmoke.js"), "utf8");

    // The script cannot be imported (it runs on load), so this reads its source. A raw .query( call, or a TypeORM
    // write method, would be a write that no confirmation stands in front of. The method list is a heuristic, not a
    // proof: the script's own reads use query builders, so builders as such cannot be banned.
    it("issues all of its SQL through read() and write(), never a raw .query( call", () => {
      expect(SCRIPT).not.toMatch(/\.query\(/);
    });

    it("never calls a TypeORM method that changes data", () => {
      expect(SCRIPT).not.toMatch(/\.(execute|insert|update|delete|save|remove|softDelete|upsert|clear|truncate)\(/);
    });

    // The script imports whole repositories and controllers, which have methods that write. Naming the read methods it
    // may call means a new call, such as byCountry in the next commit, has to be added here on purpose.
    //
    // This is a naming heuristic, not a proof, in the same way as the TypeORM check above. It matches a receiver
    // literally named like repository or controller (so locationRepository counts) followed by .method( . It does not
    // see:
    //   - a short variable name:        const repo = new PropertyRepository({}); repo.create(...)
    //   - optional chaining:            repository?.create(...)
    //   - bracket access:               repository["create"](...)
    //   - a call on a fresh instance:   new PropertyRepository({}).create(...)
    //   - a receiver named for another role, such as propertyService.createProperty(...)
    //   - an alias made after the fact: const r = repository; r.create(...)
    // It is defence in depth behind write(), which confirms the target inside itself. It is there to catch an
    // accidental new method call, not a deliberately evasive one.
    it("calls only the repository and controller methods on the allowlist", () => {
      const ALLOWED = [
        "repository.getActiveProperties",
        "controller.getActivePropertiesCard",
        "repository.getActivePropertiesByCountry",
        "controller.getActivePropertiesCardByCountry",
      ];
      const calls = [...SCRIPT.matchAll(/\b(\w*(?:repository|controller))\.(\w+)\(/gi)].map(([, receiver, method]) => `${receiver}.${method}`);

      expect(calls.length).toBeGreaterThan(0);
      expect(calls.filter((call) => !ALLOWED.includes(call))).toEqual([]);
    });

    // Three tables are written (property, moderation event, location), so three inserts and three deletes. Every one
    // goes through writeSql, which has the script's only direct write() call. A new statement changes these numbers,
    // which is the prompt to check it goes through writeSql and update them here.
    it("sends every insert and delete through write(): three inserts, three deletes", () => {
      expect(SCRIPT.match(/=> write\(/g)).toHaveLength(1);
      expect(SCRIPT.match(/await write\(/g)).toBeNull();
      expect(SCRIPT.match(/writeSql\(/g)).toHaveLength(6);
      expect(SCRIPT.match(/INSERT INTO test\./g)).toHaveLength(3);
      expect(SCRIPT.match(/DELETE FROM test\./g)).toHaveLength(3);
    });
  });
});
