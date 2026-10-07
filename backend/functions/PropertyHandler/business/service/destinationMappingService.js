import { DestinationRepository, MAX_BATCH_SIZE } from "../../data/repository/destinationRepository.js";
import { resolveDestinationChain } from "./destinationResolver.js";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCHES = 200;

const cleanText = (value) => String(value || "").trim();

export const clampBatchSize = (batchSize) =>
  Math.min(Math.max(Math.trunc(Number(batchSize)) || DEFAULT_BATCH_SIZE, 1), MAX_BATCH_SIZE);

export class DestinationMappingService {
  constructor({ destinationRepository = new DestinationRepository() } = {}) {
    this.destinationRepository = destinationRepository;
  }

  async mapPropertyLocation(propertyId) {
    const normalizedPropertyId = cleanText(propertyId);
    if (!normalizedPropertyId) {
      throw new Error("A property id is required to map a destination.");
    }

    const location = await this.destinationRepository.getLocationForMapping(normalizedPropertyId);
    if (!location) {
      return { propertyId: normalizedPropertyId, outcome: "unresolved", reason: "no_location", path: null };
    }

    const source = { sourceCountry: location.country, sourceCity: location.city };
    const chain = resolveDestinationChain({ country: cleanText(location.country), city: cleanText(location.city) });
    if (!chain.country) {
      const { current } = await this.destinationRepository.removePropertyDestination(normalizedPropertyId, source);
      const outcome = current ? "unresolved" : "stale";
      const reason = current ? chain.unresolved : "location_changed";
      return { propertyId: normalizedPropertyId, outcome, reason, path: null };
    }

    const written = await this.destinationRepository.syncPropertyDestination(normalizedPropertyId, chain, source);
    return {
      propertyId: normalizedPropertyId,
      outcome: written ? "mapped" : "stale",
      reason: written ? chain.unresolved : "location_changed",
      path: (chain.city || chain.country).path,
    };
  }

  async mapPropertyLocationSafely(propertyId) {
    try {
      return await this.mapPropertyLocation(propertyId);
    } catch (error) {
      console.error(`[Destinations] the destination of property ${propertyId} was not updated.`, error);
      return { propertyId: cleanText(propertyId), outcome: "failed", reason: error.message, path: null };
    }
  }

  async backfill({ batchSize = DEFAULT_BATCH_SIZE, maxBatches = MAX_BATCHES, after = "", onProperty = () => {} } = {}) {
    const limit = clampBatchSize(batchSize);
    const summary = {
      mapped: 0,
      unresolved: 0,
      stale: 0,
      failed: 0,
      batches: 0,
      complete: false,
      cursor: String(after || ""),
      failures: [],
    };

    while (summary.batches < maxBatches) {
      const propertyIds = await this.destinationRepository.listPropertyIdsNeedingMapping({
        after: summary.cursor,
        limit,
      });
      if (propertyIds.length === 0) {
        summary.complete = true;
        break;
      }
      summary.batches += 1;

      for (const propertyId of propertyIds) {
        const result = await this.mapPropertyLocationSafely(propertyId);
        summary[result.outcome] += 1;
        if (result.outcome === "failed") {
          summary.failures.push({ propertyId, message: result.reason });
        }
        onProperty(result);
      }

      summary.cursor = propertyIds[propertyIds.length - 1];
      if (propertyIds.length < limit) {
        summary.complete = true;
        break;
      }
    }

    return summary;
  }
}

export default DestinationMappingService;
