import vm from "node:vm";

export const FUNCTION_SIZE_LIMIT_BYTES = 10000;

const MAP_LINE_PATTERN = /^var ALIASES = (.*);$/gm;

const findMapLine = (source) => {
  const lines = [...source.matchAll(MAP_LINE_PATTERN)];
  if (lines.length !== 1) {
    throw new Error(`The function needs exactly one alias map line, found ${lines.length}.`);
  }
  return lines[0];
};

const byAlias = ([left], [right]) => {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
};

export const renderAliases = (pairs) => {
  const entryOf = ([alias, primary]) => `${JSON.stringify(alias)}:${JSON.stringify(primary)}`;
  const entries = [...pairs].sort(byAlias).map(entryOf);
  return `var ALIASES = {${entries.join(",")}};`;
};

const parseMap = (line) => {
  try {
    return JSON.parse(line[1]);
  } catch (error) {
    throw new Error(`The alias map is not one line of JSON: ${line[0]}`, { cause: error });
  }
};

export const aliasesOf = (source) => {
  const line = findMapLine(source);
  const map = parseMap(line);
  const isObject = map !== null && typeof map === "object" && !Array.isArray(map);
  if (!isObject || !Object.values(map).every((primary) => typeof primary === "string")) {
    throw new Error(`The alias map is not an object of aliases and their primaries: ${line[0]}`);
  }
  const pairs = Object.entries(map).sort(byAlias);
  if (renderAliases(pairs) !== line[0]) {
    throw new Error(`The alias map is not sorted JSON on one line without spaces: ${line[0]}`);
  }
  return pairs;
};

export const replaceAliases = (source, pairs) => {
  const line = findMapLine(source);
  return source.slice(0, line.index) + renderAliases(pairs) + source.slice(line.index + line[0].length);
};

const hostRuleOf = (source) => vm.runInNewContext(`${source}\nisHostName`);

export const aliasProblems = (source, pairs) => {
  const isHostName = hostRuleOf(source);
  const aliases = new Set();
  const problems = [];
  for (const [alias, primary] of pairs) {
    if (!isHostName(alias)) {
      problems.push(`${alias} is not a lowercase hostname without a port or a trailing dot`);
    }
    if (!isHostName(primary)) {
      problems.push(`the primary ${primary} of ${alias} is not a lowercase hostname without a port or a trailing dot`);
    }
    if (alias === primary) {
      problems.push(`${alias} points at itself`);
    }
    if (aliases.has(alias)) {
      problems.push(`${alias} is listed more than once`);
    }
    aliases.add(alias);
  }
  for (const [alias, primary] of pairs) {
    if (primary !== alias && aliases.has(primary)) {
      problems.push(`the primary ${primary} of ${alias} is an alias itself`);
    }
  }
  return problems;
};

const ROW_COUNT_PATTERN = /^rows: (\d+)$/;

export const parseAliasRows = (text) => {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\r$/, ""))
    .filter((line) => line !== "");
  if (lines.length === 0) {
    throw new Error("The query result is empty, it needs at least its header row.");
  }
  const columns = lines[0].split("\t");
  const isOnce = (name) => columns.filter((column) => column === name).length === 1;
  if (!isOnce("alias") || !isOnce("primary_domain")) {
    throw new Error("The query result needs the columns alias and primary_domain, each once.");
  }
  const rows = lines.slice(1);
  const rowCount = ROW_COUNT_PATTERN.exec(rows.at(-1) || "");
  if (rowCount) {
    rows.pop();
    if (Number(rowCount[1]) !== rows.length) {
      throw new Error(`The query result says it has ${rowCount[1]} rows, but holds ${rows.length}.`);
    }
  }
  return rows.map((line) => {
    const fields = line.split("\t");
    if (fields.length !== columns.length) {
      throw new Error(`This row of the query result does not have ${columns.length} columns: ${line}`);
    }
    return [fields[columns.indexOf("alias")], fields[columns.indexOf("primary_domain")]];
  });
};

export const withAliases = (source, pairs) => {
  const problems = aliasProblems(source, pairs);
  if (problems.length > 0) {
    throw new Error(`The alias map was not written:\n${problems.join("\n")}`);
  }
  const written = replaceAliases(source, pairs);
  const bytes = Buffer.byteLength(written, "utf8");
  if (bytes >= FUNCTION_SIZE_LIMIT_BYTES) {
    const limit = FUNCTION_SIZE_LIMIT_BYTES;
    throw new Error(`The alias map was not written: the function would be ${bytes} bytes, the limit is ${limit}.`);
  }
  return written;
};
