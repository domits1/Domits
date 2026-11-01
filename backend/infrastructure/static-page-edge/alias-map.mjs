import vm from "node:vm";

export const FUNCTION_SIZE_LIMIT_BYTES = 10000;

const MAP_BLOCK_PATTERN = /^var ALIASES = \{(\n(?:.*\n)*?)?\};$/gm;
const ENTRY_PATTERN = /^ {2}"([^"\\]*)": "([^"\\]*)",$/;

const findMapBlock = (source) => {
  const blocks = [...source.matchAll(MAP_BLOCK_PATTERN)];
  if (blocks.length !== 1) {
    throw new Error(`The function needs exactly one alias map, found ${blocks.length}.`);
  }
  return blocks[0];
};

export const aliasesOf = (source) => {
  const lines = (findMapBlock(source)[1] || "").split("\n").filter(Boolean);
  return lines.map((line) => {
    const entry = ENTRY_PATTERN.exec(line);
    if (!entry) {
      throw new Error(`This line of the alias map is not one alias and its primary: ${line}`);
    }
    return [entry[1], entry[2]];
  });
};

const byAlias = ([left], [right]) => {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
};

export const renderAliases = (pairs) => {
  if (pairs.length === 0) {
    return "var ALIASES = {};";
  }
  const sorted = [...pairs].sort(byAlias);
  const lines = sorted.map(([alias, primary]) => `  ${JSON.stringify(alias)}: ${JSON.stringify(primary)},\n`);
  return `var ALIASES = {\n${lines.join("")}};`;
};

export const replaceAliases = (source, pairs) => {
  const block = findMapBlock(source);
  return source.slice(0, block.index) + renderAliases(pairs) + source.slice(block.index + block[0].length);
};

const hostRulesOf = (source) =>
  vm.runInNewContext(`${source}\n({ normalizeHostName: normalizeHostName, isHostName: isHostName })`);

export const aliasProblems = (source, pairs) => {
  const { normalizeHostName, isHostName } = hostRulesOf(source);
  const isNormalHost = (host) => normalizeHostName(host) === host && isHostName(host);
  const aliases = new Set();
  const problems = [];
  for (const [alias, primary] of pairs) {
    if (!isNormalHost(alias)) {
      problems.push(`${alias} is not a lowercase hostname without a port or a trailing dot`);
    }
    if (!isNormalHost(primary)) {
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
