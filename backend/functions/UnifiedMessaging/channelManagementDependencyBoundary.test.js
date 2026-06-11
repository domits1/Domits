import fs from "node:fs";
import path from "node:path";

const functionsRoot = path.join(process.cwd(), "functions");
const sharedRoot = path.join(functionsRoot, ".shared", "channelManagement");
const importPattern = /(?:from\s+|import\s*\(\s*|require\(\s*)["']([^"']+)["']/g;

const listJavaScriptFiles = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listJavaScriptFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });

const getImportSpecifiers = (filePath) => {
  const source = fs.readFileSync(filePath, "utf8");
  return Array.from(source.matchAll(importPattern), (match) => match[1]);
};

const isLambdaHandlerImport = (filePath, specifier) => {
  if (!specifier.startsWith(".")) return false;

  const resolvedPath = path.resolve(path.dirname(filePath), specifier);
  return (
    path.basename(resolvedPath) === "index.js" &&
    path.dirname(path.dirname(resolvedPath)) === functionsRoot
  );
};

describe("shared ChannelManagement dependency boundary", () => {
  test("contains an importable shared service boundary", () => {
    expect(
      fs.existsSync(path.join(sharedRoot, "channelManagementService.js"))
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(sharedRoot, "services", "channexBookingPollingService.js")
      )
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(sharedRoot, "services", "channexBookingRevisionImportService.js")
      )
    ).toBe(true);
  });

  test("does not import UnifiedMessaging or Lambda handlers", () => {
    const violations = listJavaScriptFiles(sharedRoot).flatMap((filePath) =>
      getImportSpecifiers(filePath)
        .filter(
          (specifier) =>
            specifier.includes("UnifiedMessaging") || isLambdaHandlerImport(filePath, specifier)
        )
        .map((specifier) => `${path.relative(functionsRoot, filePath)} -> ${specifier}`)
    );

    expect(violations).toEqual([]);
  });
});
