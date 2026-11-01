import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FUNCTION_SIZE_LIMIT_BYTES,
  aliasProblems,
  aliasesOf,
  parseAliasRows,
  replaceAliases,
  withAliases,
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

  it("is written in its one form, sorted JSON on one line, so one alias list always gives the same bytes", () => {
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
    expect(written).toContain(`\nvar ALIASES = {"${ALIAS}":"${PRIMARY}","${pairs[0][0]}":"${pairs[0][1]}"};\n`);
    expect(written.replace(/^var ALIASES = .*$/m, "")).toBe(SOURCE.replace(/^var ALIASES = .*$/m, ""));
  });

  it("writes an empty map and reads it back as empty", () => {
    const written = replaceAliases(SOURCE, []);

    expect(written).toContain("\nvar ALIASES = {};\n");
    expect(aliasesOf(written)).toEqual([]);
    expect(aliasesOf(replaceAliases(written, [[ALIAS, PRIMARY]]))).toEqual([[ALIAS, PRIMARY]]);
  });

  it.each([
    ["no map", SOURCE.replace(/^var ALIASES = /m, "var OTHER = ")],
    ["two maps", `${SOURCE}\nvar ALIASES = {};\n`],
    ["the map over several lines", SOURCE.replace(/^var ALIASES = \{(.*)\};$/m, "var ALIASES = {\n  $1,\n};")],
  ])("refuses a function with %s", (_name, source) => {
    expect(() => aliasesOf(source)).toThrow(/exactly one alias map line/);
    expect(() => replaceAliases(source, [[ALIAS, PRIMARY]])).toThrow(/exactly one alias map line/);
  });

  const withMapLine = (value) => SOURCE.replace(/^var ALIASES = .*$/m, `var ALIASES = ${value};`);

  it.each([
    ["that is no JSON", `{"${ALIAS}":"${PRIMARY}",}`, /not one line of JSON/],
    ["that holds something after the map", `{"${ALIAS}":"${PRIMARY}"}; var OTHER = {}`, /not one line of JSON/],
    ["that is a list", `[["${ALIAS}","${PRIMARY}"]]`, /not an object of aliases/],
    ["that is null", "null", /not an object of aliases/],
    ["that is a string", `"${ALIAS}"`, /not an object of aliases/],
    ["with a primary that is no string", `{"${ALIAS}":1}`, /not an object of aliases/],
    ["with spaces", `{"${ALIAS}": "${PRIMARY}"}`, /not sorted JSON on one line without spaces/],
    ["out of order", `{"${ALIAS}":"${PRIMARY}","a.example.com":"${PRIMARY}"}`, /not sorted JSON/],
    ["with an alias twice", `{"${ALIAS}":"other.example.com","${ALIAS}":"${PRIMARY}"}`, /not sorted JSON/],
    ["with an escaped letter", `{"${ALIAS}":"www.villasensua\\u006c.nl"}`, /not sorted JSON/],
  ])("refuses a map line %s", (_name, value, message) => {
    expect(() => aliasesOf(withMapLine(value))).toThrow(message);
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

describe("reading the result of the alias query", () => {
  const HEADER = "site_id\talias\talias_type\tprimary_domain";
  const row = (alias, primary) => `6156b005-88d4-4230-9bf1-2f01214cc1a0\t${alias}\tFALLBACK\t${primary}`;

  it("takes the alias and primary_domain columns by name and skips the lines without a column", () => {
    const result = [HEADER, row(ALIAS, PRIMARY), row("villasensual.nl", PRIMARY), "rows: 2", ""].join("\n");

    expect(parseAliasRows(result)).toEqual([
      [ALIAS, PRIMARY],
      ["villasensual.nl", PRIMARY],
    ]);
  });

  it("reads the columns in any order and with Windows line ends", () => {
    const result = `primary_domain\talias\r\n${PRIMARY}\t${ALIAS}\r\n`;

    expect(parseAliasRows(result)).toEqual([[ALIAS, PRIMARY]]);
  });

  it("reads a result without rows as an empty map", () => {
    expect(parseAliasRows(`${HEADER}\nrows: 0\n`)).toEqual([]);
  });

  it.each([
    ["nothing at all", "", /no header row/],
    ["no primary_domain column", "site_id\talias\n1\tx.example.com", /columns alias and primary_domain/],
    ["no alias column", "site_id\tprimary_domain\n1\tx.example.com", /columns alias and primary_domain/],
    ["a row with a column too few", `${HEADER}\n1\t${ALIAS}\t${PRIMARY}`, /does not have 4 columns/],
    ["a row with a column too many", `${HEADER}\n${row(ALIAS, PRIMARY)}\textra`, /does not have 4 columns/],
  ])("refuses %s", (_name, result, message) => {
    expect(() => parseAliasRows(result)).toThrow(message);
  });
});

describe("writing the alias map into the function", () => {
  const longestRealisticPairs = (count) =>
    Array.from({ length: count }, (_, index) => [longestRealisticAlias(index), LONGEST_REALISTIC_PRIMARY]);
  const paddedTo = (bytes) => {
    const padding = (length) => `${SOURCE}var PADDING = "${"x".repeat(length)}";\n`;
    const written = Buffer.byteLength(replaceAliases(padding(0), [[ALIAS, PRIMARY]]), "utf8");
    return padding(bytes - written);
  };

  it("writes a map that follows the rules and keeps the rest of the function", () => {
    const pairs = [
      ["villasensual.nl", PRIMARY],
      [ALIAS, PRIMARY],
    ];

    const written = withAliases(SOURCE, pairs);

    expect(written).toBe(replaceAliases(SOURCE, pairs));
    expect(aliasesOf(written)).toEqual([pairs[1], pairs[0]]);
  });

  it("refuses a map that breaks a rule, and names every problem", () => {
    const pairs = [
      [ALIAS, ALIAS],
      ["villasensual.nl", `${PRIMARY}:443`],
    ];

    expect(() => withAliases(SOURCE, pairs)).toThrow(
      `The alias map was not written:\n${ALIAS} points at itself\n` +
        `the primary ${PRIMARY}:443 of villasensual.nl is not a lowercase hostname without a port or a trailing dot`
    );
  });

  it("writes 40 aliases of the longest realistic length and refuses 60", () => {
    expect(() => withAliases(SOURCE, longestRealisticPairs(40))).not.toThrow();
    expect(() => withAliases(SOURCE, longestRealisticPairs(60))).toThrow(/the limit is 10000/);
  });

  it("refuses a function that would reach the limit exactly, and writes one a byte under it", () => {
    const atLimit = paddedTo(FUNCTION_SIZE_LIMIT_BYTES);
    const underLimit = paddedTo(FUNCTION_SIZE_LIMIT_BYTES - 1);

    expect(() => withAliases(atLimit, [[ALIAS, PRIMARY]])).toThrow(/would be 10000 bytes/);
    expect(Buffer.byteLength(withAliases(underLimit, [[ALIAS, PRIMARY]]), "utf8")).toBe(FUNCTION_SIZE_LIMIT_BYTES - 1);
  });
});
