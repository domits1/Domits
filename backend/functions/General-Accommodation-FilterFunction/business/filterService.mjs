import { fetchProperties } from '../data/propertyRepository.mjs';
import { filterByPrice } from '../filters/priceFilter.mjs';
import { filterByGuests } from '../search/guestAmountFilter.mjs';
import { filterByLocation } from '../search/locationFilter.mjs';

export class FilterService {
  async getFilteredProperties({ min, max, guests, country, city, lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId }) {
    const { properties: raw, lastEvaluatedKey } = await fetchProperties(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId);
    let properties = raw;

    if (min != null || max != null) {
      properties = filterByPrice(properties, min, max);
    }

    if (guests) {
      properties = filterByGuests(properties, guests);
    }

    if (city || country) {
      properties = filterByLocation(properties, country, city);
    }

    return { properties, lastEvaluatedKey };
  }
}
