#!/usr/bin/env node

import Database from "database";
import {
  DestinationMappingService,
  clampBatchSize,
} from "../functions/PropertyHandler/business/service/destinationMappingService.js";
import { DestinationRepository } from "../functions/PropertyHandler/data/repository/destinationRepository.js";
import { resolveDestinationChain } from "../functions/PropertyHandler/business/service/destinationResolver.js";

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

const dryRun = async (repository, batchSize, start) => {
  const counts = new Map();
  let after = start;
  let total = 0;
  let unresolved = 0;
  for (;;) {
    const ids = await repository.listPropertyIdsNeedingMapping({ after, limit: batchSize });
    if (ids.length === 0) break;
    for (const propertyId of ids) {
      const location = await repository.getLocationForMapping(propertyId);
      const chain = location ? resolveDestinationChain(location) : { unresolved: "no_location" };
      total += 1;
      if (!chain.country) {
        unresolved += 1;
        console.log(`would leave unmapped ${propertyId}: ${chain.unresolved}`);
        continue;
      }
      const path = (chain.city || chain.country).path;
      counts.set(path, (counts.get(path) || 0) + 1);
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
  const { commit, batchSize, after } = parseArgs();
  console.log(`Backfill destinations - commit=${commit} batchSize=${batchSize} after=${after || "(start)"}`);
  const repository = new DestinationRepository();
  if (!commit) {
    await dryRun(repository, batchSize, after);
    return;
  }
  const summary = await new DestinationMappingService({ destinationRepository: repository }).backfill({
    batchSize,
    after,
    onProperty: (result) => console.log(`${result.outcome} ${result.propertyId} ${result.path || result.reason || ""}`),
  });
  console.log(
    `Finished. mapped=${summary.mapped} unresolved=${summary.unresolved} stale=${summary.stale} failed=${summary.failed} batches=${summary.batches} complete=${summary.complete}`
  );
  for (const failure of summary.failures) console.log(`failed ${failure.propertyId}: ${failure.message}`);
  if (!summary.complete) console.log(`Not complete. Continue with --commit --after ${summary.cursor}`);
  if (!summary.complete || summary.failed > 0) process.exitCode = 1;
};

try {
  await main();
} finally {
  const client = await Database.getInstance().catch(() => null);
  if (client?.isInitialized) await client.destroy();
}
