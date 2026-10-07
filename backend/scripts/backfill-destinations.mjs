#!/usr/bin/env node

import Database from "database";
import {
  DestinationMappingService,
  clampBatchSize,
} from "../functions/PropertyHandler/business/service/destinationMappingService.js";
import { DestinationRepository } from "../functions/PropertyHandler/data/repository/destinationRepository.js";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const batchIndex = args.indexOf("--batch-size");
  const requested = batchIndex === -1 ? 100 : Number(args[batchIndex + 1]);
  if (!Number.isInteger(requested) || requested < 1) throw new Error("--batch-size expects a positive integer");
  const afterIndex = args.indexOf("--after");
  const after = afterIndex === -1 ? "" : String(args[afterIndex + 1] || "");
  return { commit, batchSize: clampBatchSize(requested), after };
};

const readOnly = (repository) => ({
  listPropertyIdsNeedingMapping: (options) => repository.listPropertyIdsNeedingMapping(options),
  getLocationForMapping: (propertyId) => repository.getLocationForMapping(propertyId),
  syncPropertyDestination: async () => true,
  removePropertyDestination: async () => ({ removed: false, current: true }),
  deleteMappingsWithoutProperty: () => repository.countMappingsWithoutProperty(),
});

const main = async () => {
  const { commit, batchSize, after } = parseArgs();
  const mode = commit ? "commit" : "dry run";
  console.log(`Backfill destinations - ${mode} batchSize=${batchSize} after=${after || "(start)"}`);
  const repository = commit ? new DestinationRepository() : readOnly(new DestinationRepository());
  const summary = await new DestinationMappingService({ destinationRepository: repository }).backfill({
    batchSize,
    after,
    onProperty: (result) => console.log(`${result.outcome} ${result.propertyId} ${result.path || result.reason || ""}`),
  });
  console.log(
    `Finished ${mode}. mapped=${summary.mapped} unresolved=${summary.unresolved} stale=${summary.stale} failed=${summary.failed} batches=${summary.batches} complete=${summary.complete} orphansRemoved=${summary.orphansRemoved}`
  );
  for (const failure of summary.failures) console.log(`failed ${failure.propertyId}: ${failure.message}`);
  if (!commit) console.log("Nothing was written. Run again with --commit to write.");
  if (!summary.complete)
    console.log(`Not complete. Continue with ${commit ? "--commit " : ""}--after ${summary.cursor}`);
  if (!summary.complete || summary.failed > 0) process.exitCode = 1;
};

try {
  await main();
} finally {
  const client = await Database.getInstance().catch(() => null);
  if (client?.isInitialized) await client.destroy();
}
