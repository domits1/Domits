#!/usr/bin/env node

import Database from "database";
import { DestinationMappingService } from "../functions/PropertyHandler/business/service/destinationMappingService.js";
import { DestinationRepository } from "../functions/PropertyHandler/data/repository/destinationRepository.js";
import { resolveDestinationChain } from "../functions/PropertyHandler/business/service/destinationResolver.js";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const commit = args.includes("--commit");
  const batchIndex = args.indexOf("--batch-size");
  const batchSize = batchIndex === -1 ? 100 : Number(args[batchIndex + 1]);
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new Error("--batch-size expects a positive integer");
  return { commit, batchSize };
};

const dryRun = async (repository, batchSize) => {
  const counts = new Map();
  let after = "";
  let total = 0;
  let unresolved = 0;
  for (;;) {
    const ids = await repository.listPropertyIdsNeedingMapping({ after, limit: batchSize });
    if (ids.length === 0) break;
    for (const propertyId of ids) {
      const location = await repository.getLocationForMapping(propertyId);
      const chain = location ? resolveDestinationChain(location) : { unresolved: "no_location" };
      total += 1;
      if (chain.unresolved) {
        unresolved += 1;
        console.log(`would leave unmapped ${propertyId}: ${chain.unresolved}`);
        continue;
      }
      counts.set(chain.city.path, (counts.get(chain.city.path) || 0) + 1);
    }
    after = ids[ids.length - 1];
    if (ids.length < batchSize) break;
  }
  for (const [path, count] of [...counts.entries()].sort()) console.log(`would map ${count} to ${path}`);
  console.log(
    `Dry run: ${total} properties need a mapping, ${unresolved} cannot be resolved. Run again with --commit to write.`
  );
};

const main = async () => {
  const { commit, batchSize } = parseArgs();
  console.log(`Backfill destinations - commit=${commit} batchSize=${batchSize}`);
  const repository = new DestinationRepository();
  if (!commit) {
    await dryRun(repository, batchSize);
    return;
  }
  const summary = await new DestinationMappingService({ destinationRepository: repository }).backfill({
    batchSize,
    onProperty: (result) => console.log(`${result.outcome} ${result.propertyId} ${result.path || result.reason || ""}`),
  });
  console.log(
    `Finished. mapped=${summary.mapped} unresolved=${summary.unresolved} stale=${summary.stale} failed=${summary.failed} batches=${summary.batches} complete=${summary.complete}`
  );
  for (const failure of summary.failures) console.log(`failed ${failure.propertyId}: ${failure.message}`);
  if (!summary.complete || summary.failed > 0) process.exitCode = 1;
};

try {
  await main();
} finally {
  const client = await Database.getInstance().catch(() => null);
  if (client?.isInitialized) await client.destroy();
}
