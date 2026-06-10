import { fetchAllProperties } from '../data/propertyRepository.mjs';
import { filterByPrice, getNightlyDisplayPrice } from '../filters/priceFilter.mjs';
import { filterByRoomsAndBeds } from '../filters/roomFilter.mjs';
import { filterByBookingType } from '../filters/bookingTypeFilter.mjs';
import { filterByGuests } from '../search/guestAmountFilter.mjs';
import { filterByLocation } from '../search/locationFilter.mjs';

// Fee-inclusive min/max nightly price across the full catalog, used as the
// slider bounds on the frontend. Computed before filtering so the bounds stay
// stable regardless of the active filters.
const computePriceRange = (properties) => {
  const prices = properties
    .map(getNightlyDisplayPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    return null;
  }

  return {
    min: Math.floor(Math.min(...prices)),
    max: Math.ceil(Math.max(...prices)),
  };
};

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
  }) {
    let properties = await fetchAllProperties();
    const priceRange = computePriceRange(properties);

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

    return { properties, priceRange, lastEvaluatedKey: null };
  }
}
