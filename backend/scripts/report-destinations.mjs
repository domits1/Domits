#!/usr/bin/env node

import Database from "database";
import { DestinationReportRepository } from "../functions/PropertyHandler/data/repository/destinationReportRepository.js";
import {
  buildDestinationReport,
  renderDestinationReportMarkdown,
} from "../functions/PropertyHandler/business/service/destinationReportService.js";
import { readDestinationSettings } from "../functions/PropertyHandler/util/destination/destinationSettings.js";

const format = process.argv.includes("--json") ? "json" : "markdown";

const run = async () => {
  const rows = await new DestinationReportRepository().listActiveLocationCounts();
  const report = buildDestinationReport(rows, readDestinationSettings());
  process.stdout.write(
    format === "json" ? `${JSON.stringify(report, null, 2)}\n` : `${renderDestinationReportMarkdown(report)}\n`
  );
};

try {
  await run();
} finally {
  const client = await Database.getInstance().catch(() => null);
  if (client?.isInitialized) {
    await client.destroy();
  }
}
