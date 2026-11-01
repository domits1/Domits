import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FUNCTION_SIZE_LIMIT_BYTES,
  aliasProblems,
  aliasesOf,
  replaceAliases,
} from "../../infrastructure/static-page-edge/alias-map.mjs";

const SOURCE = readFileSync(join(process.cwd(), "infrastructure", "static-page-edge", "viewer-request.js"), "utf8");
const ALIAS = "beautiful-home-amsterdam-6156b005.direct.domits.com";
const PRIMARY = "www.villasensual.nl";
const LONGEST_REALISTIC_PRIMARY = `www.${"b".repeat(32)}.com`;

const longestRealisticAlias = (index) => `${"a".repeat(40)}-${index.toString(16).padStart(8, "0")}.direct.domits.com`;

describe("the alias map the edge function ships with", () => {
  it("holds only lowercase hostnames, none pointing at itself or at another alias", () => {
    expect(aliasProblems(SOURCE, aliasesOf(SOURCE))).toEqual([]);
  });

  it("is written in its one sorted form, one line per alias", () => {
    expect(replaceAliases(SOURCE, aliasesOf(SOURCE))).toBe(SOURCE);
  });

  it("leaves room for 40 aliases of the longest realistic length", () => {
    const pairs = Array.from({ length: 40 }, (_, index) => [longestRealisticAlias(index), LONGEST_REALISTIC_PRIMARY]);

    expect(longestRealisticAlias(0)).toHaveLength(67);
    expect(Buffer.byteLength(replaceAliases(SOURCE, pairs), "utf8")).toBeLessThan(FUNCTION_SIZE_LIMIT_BYTES);
  });
});

describe("reading and replacing the alias map", () => {
  it("reads back every alias it wrote, sorted by alias", () => {
    const pairs = [
      ["villa-loiki-8cf98e11.direct.domits.com", "www.villaloiki.com"],
      [ALIAS, PRIMARY],
    ];

    const written = replaceAliases(SOURCE, pairs);

    expect(aliasesOf(written)).toEqual([pairs[1], pairs[0]]);
    expect(written.replace(/^var ALIASES = \{\n(?: {2}.*\n)*\};$/m, "")).toBe(
      SOURCE.replace(/^var ALIASES = \{\n(?: {2}.*\n)*\};$/m, "")
    );
  });

  it("writes an empty map on one line and reads it back as empty", () => {
    const written = replaceAliases(SOURCE, []);

    expect(written).toContain("\nvar ALIASES = {};\n");
    expect(aliasesOf(written)).toEqual([]);
    expect(aliasesOf(replaceAliases(written, [[ALIAS, PRIMARY]]))).toEqual([[ALIAS, PRIMARY]]);
  });

  it.each([
    ["no map", SOURCE.replace(/^var ALIASES = /m, "var OTHER = ")],
    ["two maps", `${SOURCE}\nvar ALIASES = {};\n`],
  ])("refuses a function with %s", (_name, source) => {
    expect(() => aliasesOf(source)).toThrow(/exactly one alias map/);
    expect(() => replaceAliases(source, [[ALIAS, PRIMARY]])).toThrow(/exactly one alias map/);
  });

  it.each([
    ["without its comma", `  "${ALIAS}": "${PRIMARY}"`],
    ["with two aliases", `  "${ALIAS}": "${PRIMARY}", "villasensual.nl": "${PRIMARY}",`],
    ["with an escaped quote", `  "${ALIAS}": "www.villa\\"sensual.nl",`],
    ["that is a comment", `  // "${ALIAS}": "${PRIMARY}",`],
  ])("refuses a line in the map %s", (_name, line) => {
    const source = SOURCE.replace(/^var ALIASES = \{\n/m, `var ALIASES = {\n${line}\n`);

    expect(() => aliasesOf(source)).toThrow(/not one alias and its primary/);
  });
});

describe("the rules every alias in the map follows", () => {
  it("accepts several aliases of one site, a custom domain alias, and aliases of two sites", () => {
    const pairs = [
      [ALIAS, PRIMARY],
      ["villasensual.nl", PRIMARY],
      ["villa-loiki-8cf98e11.direct.domits.com", "www.villaloiki.com"],
    ];

    expect(aliasProblems(SOURCE, pairs)).toEqual([]);
  });

  const notNormal = (host) => `${host} is not a lowercase hostname without a port or a trailing dot`;
  const primaryNotNormal = (primary) =>
    `the primary ${primary} of ${ALIAS} is not a lowercase hostname without a port or a trailing dot`;

  it.each([
    ["an alias in capitals", [["Beautiful-Home-Amsterdam-6156b005.Direct.Domits.com", PRIMARY]]],
    ["an alias with a port", [[`${ALIAS}:443`, PRIMARY]]],
    ["an alias with a trailing dot", [[`${ALIAS}.`, PRIMARY]]],
    ["an alias with spaces around it", [[` ${ALIAS} `, PRIMARY]]],
    ["an alias of one label", [["localhost", PRIMARY]]],
    ["an alias the function could never match", [["my_villa.direct.domits.com", PRIMARY]]],
  ])("refuses %s", (_name, pairs) => {
    expect(aliasProblems(SOURCE, pairs)).toEqual([notNormal(pairs[0][0])]);
  });

  it.each([
    ["in capitals", "WWW.VillaSensual.NL"],
    ["with a port", `${PRIMARY}:443`],
    ["with a trailing dot", `${PRIMARY}.`],
    ["with a path", "evil.example/login"],
    ["with a scheme", "https://evil.example"],
    ["that is empty", ""],
  ])("refuses a primary %s", (_name, primary) => {
    expect(aliasProblems(SOURCE, [[ALIAS, primary]])).toEqual([primaryNotNormal(primary)]);
  });

  it("refuses an alias that points at itself", () => {
    expect(aliasProblems(SOURCE, [[ALIAS, ALIAS]])).toEqual([`${ALIAS} points at itself`]);
  });

  it("refuses an alias listed twice, also with the same primary", () => {
    expect(
      aliasProblems(SOURCE, [
        [ALIAS, PRIMARY],
        [ALIAS, PRIMARY],
      ])
    ).toEqual([`${ALIAS} is listed more than once`]);
  });

  it("refuses a chain of two aliases, whichever comes first", () => {
    const chain = [
      [ALIAS, PRIMARY],
      [PRIMARY, "other.example.com"],
    ];
    const problem = `the primary ${PRIMARY} of ${ALIAS} is an alias itself`;

    expect(aliasProblems(SOURCE, chain)).toEqual([problem]);
    expect(aliasProblems(SOURCE, [...chain].reverse())).toEqual([problem]);
  });
});
