import { fetchProperties } from '../data/propertyRepository.mjs';
import { filterByPrice } from '../filters/priceFilter.mjs';
import { filterByRoomsAndBeds } from '../filters/roomFilter.mjs';
import { filterByBookingType } from '../filters/bookingTypeFilter.mjs';
import { filterByGuests } from '../search/guestAmountFilter.mjs';
import { filterByLocation } from '../search/locationFilter.mjs';

export class FilterService {
  async getFilteredProperties({
    min,
    max,
    guests,
    country,
    city,
    bedrooms,
    beds,
    bathrooms,
    bookingType,
    lastEvaluatedKeyCreatedAt,
    lastEvaluatedKeyId,
  }) {
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

    properties = filterByRoomsAndBeds(properties, { bedrooms, beds, bathrooms });
    properties = filterByBookingType(properties, bookingType);

    return { properties, lastEvaluatedKey };
  }
}
