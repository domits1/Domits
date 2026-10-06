import { DestinationRepository } from "../../data/repository/destinationRepository.js";
import { resolveDestinationChain } from "./destinationResolver.js";

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCHES = 200;

const cleanText = (value) => String(value || "").trim();

export class DestinationMappingService {
  constructor({ destinationRepository = new DestinationRepository() } = {}) {
    this.destinationRepository = destinationRepository;
  }

  async mapPropertyLocation(propertyId, location) {
    const normalizedPropertyId = cleanText(propertyId);
    if (!normalizedPropertyId) {
      throw new Error("A property id is required to map a destination.");
    }

    const sourceCountry = cleanText(location?.country);
    const sourceCity = cleanText(location?.city);
    const chain = resolveDestinationChain({ country: sourceCountry, city: sourceCity });
    if (!chain.country) {
      await this.destinationRepository.removePropertyDestination(normalizedPropertyId);
      return { propertyId: normalizedPropertyId, outcome: "unresolved", reason: chain.unresolved, path: null };
    }

    const written = await this.destinationRepository.syncPropertyDestination(normalizedPropertyId, chain, {
      sourceCountry: String(location.country),
      sourceCity: String(location.city ?? ""),
    });
    const target = chain.city || chain.country;
    return {
      propertyId: normalizedPropertyId,
      outcome: written ? "mapped" : "stale",
      reason: written ? chain.unresolved : "location_changed",
      path: target.path,
    };
  }

  async mapPropertyLocationSafely(propertyId, location) {
    try {
      return await this.mapPropertyLocation(propertyId, location);
    } catch (error) {
      console.error(`[Destinations] the destination of property ${propertyId} was not updated.`, error);
      return { propertyId: cleanText(propertyId), outcome: "failed", reason: error.message, path: null };
    }
  }

  async backfill({ batchSize = DEFAULT_BATCH_SIZE, maxBatches = MAX_BATCHES, onProperty = () => {} } = {}) {
    const summary = { mapped: 0, unresolved: 0, stale: 0, failed: 0, batches: 0, complete: false, failures: [] };
    let after = "";

    while (summary.batches < maxBatches) {
      const propertyIds = await this.destinationRepository.listPropertyIdsNeedingMapping({ after, limit: batchSize });
      if (propertyIds.length === 0) {
        summary.complete = true;
        break;
      }
      summary.batches += 1;

      for (const propertyId of propertyIds) {
        const location = await this.destinationRepository.getLocationForMapping(propertyId).catch((error) => {
          summary.failures.push({ propertyId, message: error.message });
          return undefined;
        });
        if (location === undefined) {
          summary.failed += 1;
          continue;
        }
        if (location === null) {
          summary.unresolved += 1;
          continue;
        }
        const result = await this.mapPropertyLocationSafely(propertyId, location);
        summary[result.outcome] += 1;
        if (result.outcome === "failed") {
          summary.failures.push({ propertyId, message: result.reason });
        }
        onProperty(result);
      }

      after = propertyIds[propertyIds.length - 1];
      if (propertyIds.length < batchSize) {
        summary.complete = true;
        break;
      }
    }

    return summary;
  }
}

export default DestinationMappingService;
