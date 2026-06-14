jest.mock(
  "@aws-sdk/client-secrets-manager",
  () => require("./integrationService.secretsManagerMock.js"),
  { virtual: true }
);

const IntegrationService = require("./integrationService.js").default;

const dependencyNames = [
  "accounts",
  "props",
  "ratePlans",
  "roomTypes",
  "sync",
  "resLinks",
  "channexEvidence",
  "channexBookingRevisions",
  "bookingAvailabilityRepository",
  "externalBookingImportRepository",
  "channexBookingAvailabilityBridge",
  "runner",
  "credentialStore",
  "holiduCredentialStore",
  "holiduProviderClient",
  "channexCredentialStore",
  "channexProviderClient",
  "channelManagementService",
  "channexMappingService",
  "channexAriPayloadService",
  "channexAriExecutionService",
  "channexAriOrchestrationService",
  "channexFullSyncService",
  "channexCertificationService",
  "channexDiagnosticsService",
  "channexBookingRevisionImportService",
  "channexAvailabilitySyncService",
  "channexBookingPollingService",
];

const expectIntegrationServiceDelegation = async ({
  dependencyName,
  methodName,
  args,
  expected,
}) => {
  const delegatedMethod = jest.fn().mockReturnValue(expected);
  const service = new IntegrationService({
    ...Object.fromEntries(dependencyNames.map((name) => [name, {}])),
    [dependencyName]: {
      [methodName]: delegatedMethod,
    },
  });

  await expect(
    Promise.resolve(service[methodName](...args))
  ).resolves.toBe(expected);
  expect(delegatedMethod).toHaveBeenCalledWith(...args);
};

module.exports = {
  expectIntegrationServiceDelegation,
};
