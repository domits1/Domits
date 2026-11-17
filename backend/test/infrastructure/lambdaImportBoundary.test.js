import { describe, it, expect } from "@jest/globals";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const FUNCTIONS_DIR = path.join(process.cwd(), "functions");
const SHARED = ".shared";
const SKIPPED = /(^|\/)(node_modules|tests|generated)(\/|$)|\.test\.m?js$/;
const SOURCE = /\.m?js$/;
const RELATIVE_SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'](\.{1,2}(?:\/[^"']*)?)["']/g;
const EXTENSION_CANDIDATES = ["", ".js", ".mjs", "/index.js"];

const isInside = (target, directory) => {
  if (directory === "") {
    return target !== ".." && !target.startsWith("../");
  }
  return target === directory || target.startsWith(`${directory}/`);
};

const boundaryProblem = (importer, specifier, directory) => {
  const target = path.posix.join(path.posix.dirname(importer), specifier);
  if (!isInside(target, directory)) {
    return `leaves ${directory || "the package"}`;
  }
  const sharedFileExists = EXTENSION_CANDIDATES.some((extension) =>
    existsSync(path.join(FUNCTIONS_DIR, target + extension))
  );
  if (isInside(target, SHARED) && !sharedFileExists) {
    return `missing ${target}`;
  }
  return null;
};

const listSources = (root, relative = "") =>
  readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (SKIPPED.test(child)) {
      return [];
    }
    if (entry.isDirectory()) {
      return listSources(root, child);
    }
    return SOURCE.test(entry.name) ? [child] : [];
  });

const extractRelativeSpecifiers = (source) =>
  [...source.matchAll(RELATIVE_SPECIFIER)].map(([, specifier]) => specifier);

const findViolations = (name) => {
  const root = path.join(FUNCTIONS_DIR, name);
  const isShared = name === SHARED;
  return listSources(root).flatMap((file) => {
    const source = readFileSync(path.join(root, file), "utf8");
    return extractRelativeSpecifiers(source).flatMap((specifier) => {
      const problem = boundaryProblem(isShared ? `${SHARED}/${file}` : file, specifier, isShared ? SHARED : "");
      return problem ? [`${name}/${file} imports "${specifier}": ${problem}`] : [];
    });
  });
};

const packageNames = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe("Lambda package import boundary", () => {
  it.each([
    ["business/service/a.js", "../../../.shared/dsqlRetry.js", "", "leaves the package"],
    ["business/service/a.js", "../../.shared/dsqlRetry.js", "", null],
    ["controller/a.js", "../.shared/dsqlRetry.js", "", null],
    ["index.js", "./.shared/missingHelper.js", "", "missing .shared/missingHelper.js"],
    [".shared/util/a.js", "../dsqlRetry.js", SHARED, null],
    [".shared/util/a.js", "../../PropertyHandler/index.js", SHARED, "leaves .shared"],
  ])("%s importing %s gives %s", (importer, specifier, directory, expected) => {
    expect(boundaryProblem(importer, specifier, directory)).toBe(expected);
  });

  it("extracts every relative import form and ignores package imports", () => {
    const source = [
      'import { a } from "../a.js";',
      'export * from "./b.js";',
      'const c = require("../../c.js");',
      'await import("../d.js");',
      'import Database from "database";',
    ].join("\n");
    expect(extractRelativeSpecifiers(source)).toEqual(["../a.js", "./b.js", "../../c.js", "../d.js"]);
  });

  it("scans the PropertyHandler package and the shared folder", () => {
    expect(packageNames).toEqual(expect.arrayContaining(["PropertyHandler", SHARED]));
    expect(listSources(path.join(FUNCTIONS_DIR, "PropertyHandler"))).toContain("index.js");
  });

  it.each(packageNames)("keeps every relative import of %s inside its package", (name) => {
    expect(findViolations(name)).toEqual([]);
  });
});
