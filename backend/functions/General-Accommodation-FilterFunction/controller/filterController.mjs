import { FilterService } from '../business/filterService.mjs';
import { ok, serverError } from '../util/responseHelper.mjs';

export class FilterController {
  constructor() {
    this.service = new FilterService();
  }

  async getFilteredProperties(event) {
    const queryParams = event.queryStringParameters || {};
    const {
      minPrice: min,
      maxPrice: max,
      guests,
      country,
      city,
      lastEvaluatedKeyCreatedAt,
      lastEvaluatedKeyId,
    } = queryParams;

    try {
      const result = await this.service.getFilteredProperties({
        min, max, guests, country, city, lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId,
      });
      return ok(result);
    } catch (err) {
      console.error("Error in filter controller:", err);
      return serverError("Internal Server Error", err.message);
    }
  }
}
