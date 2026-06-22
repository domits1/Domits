import fs from "node:fs";
import path from "node:path";

jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./business/integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const ChannexAriExecutionService =
  require("../.shared/channelManagement/services/channexAriExecutionService.js").default;
const ChannexFullSyncService =
  require("../.shared/channelManagement/services/channexFullSyncService.js").default;
const ChannexCertificationService =
  require("../.shared/channelManagement/services/channexCertificationService.js").default;
const ChannexDiagnosticsService =
  require("../.shared/channelManagement/services/channexDiagnosticsService.js").default;
const ChannelManagementApiService =
  require("../.shared/channelManagement/channelManagementApiService.js").default;

const functionsRoot = path.join(process.cwd(), "functions");
const sharedRoot = path.join(functionsRoot, ".shared", "channelManagement");
const importPattern = /(?:from\s+|import\s*\(\s*|require\(\s*)["']([^"']+)["']/g;
const sharedServiceConstructors = [
  ChannexAriExecutionService,
  ChannexFullSyncService,
  ChannexCertificationService,
  ChannexDiagnosticsService,
];
const requiredSharedFiles = [
  "channelManagementService.js",
  "services/channexBookingPollingService.js",
  "services/channexBookingRevisionImportService.js",
  "services/channexAvailabilitySyncService.js",
  "services/channexMappingService.js",
  "services/channexAriPayloadService.js",
  "services/channexAriExecutionService.js",
  "services/channexFullSyncService.js",
  "services/channexCertificationService.js",
  "services/channexDiagnosticsService.js",
  "services/channexAriOrchestrationService.js",
  "channelManagementApiService.js",
  "controller/channelManagementController.js",
  "handler/channelManagementHandler.js",
  "utils/channexAriDateUtils.js",
  "utils/channexAriPayloadUtils.js",
  "utils/channexAriExecutionUtils.js",
];

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
    expect(() => new ChannelManagementApiService()).not.toThrow();
    for (const ServiceConstructor of sharedServiceConstructors) {
      expect(typeof ServiceConstructor).toBe("function");
    }

    const missingFiles = requiredSharedFiles.filter(
      (relativePath) => !fs.existsSync(path.join(sharedRoot, relativePath))
    );
    expect(missingFiles).toEqual([]);
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
