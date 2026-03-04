import { Repository } from "../../data/repository.js";
import {
  buildBlockedDatesFromEvents,
  toPositiveInteger,
} from "../../../.shared/basicIcsUtils.js";
import { buildSourceUpsertPayload, fetchExternalCalendar } from "../../../.shared/icalTransport.js";

const DEFAULT_SYNC_INTERVAL_MINUTES = 2;
const DEFAULT_SYNC_BATCH_LIMIT = 500;
const DEFAULT_SYNC_CONCURRENCY = 8;
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

const isDueForSync = (lastSyncAt, cutoffMs) => {
  const rawValue = String(lastSyncAt || "").trim();
  if (!rawValue) {
    return true;
  }

  const parsedTimestamp = Date.parse(rawValue);
  if (!Number.isFinite(parsedTimestamp)) {
    return true;
  }

  return parsedTimestamp <= cutoffMs;
};

export class Service {
  constructor() {
    this.repository = new Repository();
  }

  getConfig(event = {}) {
    const eventIntervalMinutes = toPositiveInteger(event?.syncIntervalMinutes, null);
    const eventLimit = toPositiveInteger(event?.limit, null);
    const eventConcurrency = toPositiveInteger(event?.concurrency, null);

    return {
      syncIntervalMinutes:
        eventIntervalMinutes ||
        toPositiveInteger(process.env.SYNC_INTERVAL_MINUTES, DEFAULT_SYNC_INTERVAL_MINUTES),
      batchLimit: eventLimit || toPositiveInteger(process.env.SYNC_BATCH_LIMIT, DEFAULT_SYNC_BATCH_LIMIT),
      concurrency: eventConcurrency || toPositiveInteger(process.env.SYNC_CONCURRENCY, DEFAULT_SYNC_CONCURRENCY),
      fetchTimeoutMs: toPositiveInteger(process.env.SYNC_FETCH_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS),
    };
  }

  async runScheduledSync(event = {}) {
    const config = this.getConfig(event);
    const nowMs = Date.now();
    const cutoffMs = nowMs - config.syncIntervalMinutes * 60 * 1000;

    const allSources = await this.repository.listSources(config.batchLimit);
    const forceSync = event?.force === true;
    const dueSources = forceSync ? allSources : allSources.filter((source) => isDueForSync(source?.lastSyncAt, cutoffMs));

    const syncResults = await runWithConcurrency(dueSources, config.concurrency, async (source) => {
      try {
        await this.refreshSingleSource(source, config.fetchTimeoutMs);
        return { sourceId: source.sourceId, propertyId: source.propertyId, ok: true };
      } catch (error) {
        console.error(
          `Ical-sync-scheduler source refresh failed: propertyId=${source?.propertyId} sourceId=${source?.sourceId}`,
          error?.message || error
        );
        return { sourceId: source.sourceId, propertyId: source.propertyId, ok: false };
      }
    });

    const succeeded = syncResults.filter((result) => result?.ok).length;
    const failed = syncResults.length - succeeded;

    return {
      ok: true,
      config: {
        syncIntervalMinutes: config.syncIntervalMinutes,
        batchLimit: config.batchLimit,
        concurrency: config.concurrency,
      },
      scanned: allSources.length,
      due: dueSources.length,
      synced: syncResults.length,
      succeeded,
      failed,
      at: new Date(nowMs).toISOString(),
    };
  }

  async refreshSingleSource(source, fetchTimeoutMs) {
    const propertyId = String(source?.propertyId || "").trim();
    const sourceId = String(source?.sourceId || "").trim();
    const calendarUrl = String(source?.calendarUrl || "").trim();
    if (!propertyId || !sourceId || !calendarUrl) {
      return;
    }

    const { events, meta } = await this.retrieveFromExternalCalendar(calendarUrl, fetchTimeoutMs);
    const blockedDates = buildBlockedDatesFromEvents(events);
    await this.repository.upsertSource(
      buildSourceUpsertPayload({
        propertyId,
        source,
        blockedDates,
        meta,
      })
    );
  }

  async retrieveFromExternalCalendar(calendarUrl, timeoutMs) {
    return fetchExternalCalendar({
      calendarUrl,
      timeoutMs: toPositiveInteger(timeoutMs, DEFAULT_FETCH_TIMEOUT_MS),
      userAgent: "Domits-Ical-Sync-Scheduler/1.0",
    });
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const queue = [...items];
  const results = [];
  const workerCount = Math.max(1, Math.min(concurrency, queue.length));
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        continue;
      }
      const result = await worker(item);
      results.push(result);
    }
  });

  await Promise.all(workers);
  return results;
}
