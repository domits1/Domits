import { useState, useEffect } from "react";
import { MAX_PRICE, MIN_PRICE } from "../../constants/searchFilters";
import { getListingPricingBreakdown } from "../../features/bookingengine/listingdetails/utils/pricing";

const FILTER_URL = "https://t0a6yt5e83.execute-api.eu-north-1.amazonaws.com/default/General-Accommodation-FilterFunction";

const appendPositiveNumberParam = (params, key, value) => {
  if (value > 0) {
    params.append(key, value);
  }
};

const computePriceBounds = (properties) => {
  const prices = properties
    .map((p) => getListingPricingBreakdown(p?.propertyPricing, 1).nightlyDisplayPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  if (prices.length === 0) {
    return [MIN_PRICE, MAX_PRICE];
  }

  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
};

export default function useFilterLogic(props) {
  const { onFilterApplied } = props || {};

  const [priceBounds, setPriceBounds] = useState([MIN_PRICE, MAX_PRICE]);
  const [priceValues, setPriceValues] = useState([MIN_PRICE, MAX_PRICE]);

  // Derive the slider's min/max from the actual catalog prices on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(FILTER_URL);
        const data = await response.json();
        if (cancelled) return;

        // Prefer the price range computed by the backend; fall back to deriving
        // it client-side if the endpoint doesn't provide it yet.
        const range = data?.priceRange;
        let bounds;
        if (range && Number.isFinite(range.min) && Number.isFinite(range.max)) {
          bounds = [range.min, range.max];
        } else {
          const properties = Array.isArray(data) ? data : (data?.properties ?? []);
          bounds = computePriceBounds(properties);
        }

        setPriceBounds(bounds);
        setPriceValues(bounds);
      } catch {
        // Keep the default bounds if the lookup fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Selected amenity ids (matching the ids in src/store/amenities.js).
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  const [showMoreFacilities, setShowMoreFacilities] = useState(false);

  const [roomsAndBeds, setRoomsAndBeds] = useState({
    bedrooms: 0,
    beds: 0,
    bathrooms: 0,
  });

  const handleRoomChange = (key, delta) => {
    const nextRoomsAndBeds = {
      ...roomsAndBeds,
      [key]: Math.max(0, roomsAndBeds[key] + delta),
    };
    setRoomsAndBeds(nextRoomsAndBeds);
  };

  const [bookingOptions, setBookingOptions] = useState({
    bookInstantly: false,
    bookingRequest: false,
  });

  const handleBookingOptionChange = (event) => {
    const nextBookingOptions = {
      ...bookingOptions,
      [event.target.name]: event.target.checked,
    };
    setBookingOptions(nextBookingOptions);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchFilteredAccommodations(overrides = {}) {
    const nextPriceValues = overrides.priceValues ?? priceValues;
    const nextRoomsAndBeds = overrides.roomsAndBeds ?? roomsAndBeds;
    const nextBookingOptions = overrides.bookingOptions ?? bookingOptions;
    const nextSelectedAmenities = overrides.selectedAmenities ?? selectedAmenities;

    try {
      setLoading(true);
      setError(null);

      const url = new URL(FILTER_URL);
      url.searchParams.append("minPrice", nextPriceValues[0]);
      url.searchParams.append("maxPrice", nextPriceValues[1]);
      appendPositiveNumberParam(url.searchParams, "bedrooms", nextRoomsAndBeds.bedrooms);
      appendPositiveNumberParam(url.searchParams, "beds", nextRoomsAndBeds.beds);
      appendPositiveNumberParam(url.searchParams, "bathrooms", nextRoomsAndBeds.bathrooms);

      if (nextSelectedAmenities.length > 0) {
        url.searchParams.append("amenities", nextSelectedAmenities.join(","));
      }

      if (nextBookingOptions.bookInstantly && !nextBookingOptions.bookingRequest) {
        url.searchParams.append("bookingType", "direct");
      }

      if (nextBookingOptions.bookingRequest && !nextBookingOptions.bookInstantly) {
        url.searchParams.append("bookingType", "inquiry");
      }

      const response = await fetch(url);
      const data = await response.json();
      const properties = Array.isArray(data) ? data : (data?.properties ?? []);
      const lastEvaluatedKey = Array.isArray(data) ? null : (data?.lastEvaluatedKey ?? null);

      if (onFilterApplied) {
        onFilterApplied(properties, lastEvaluatedKey, {
          minPrice: nextPriceValues[0],
          maxPrice: nextPriceValues[1],
          roomsAndBeds: nextRoomsAndBeds,
          bookingOptions: nextBookingOptions,
        });
      }

      if (properties.length === 0) {
        setError("No accommodations found for these criteria");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handlePriceChange = (index, value) => {
    const newValues = [...priceValues];
    newValues[index] = Number(value);
    if (newValues[0] <= newValues[1]) {
      setPriceValues(newValues);
      return newValues;
    }
    return priceValues;
  };

  const handleResetFilters = () => {
    const defaultPriceValues = [...priceBounds];
    const defaultRoomsAndBeds = { bedrooms: 0, beds: 0, bathrooms: 0 };
    const defaultBookingOptions = { bookInstantly: false, bookingRequest: false };

    setPriceValues(defaultPriceValues);
    setRoomsAndBeds(defaultRoomsAndBeds);
    setBookingOptions(defaultBookingOptions);
    setSelectedAmenities([]);
    setError(null);

    fetchFilteredAccommodations({
      priceValues: defaultPriceValues,
      roomsAndBeds: defaultRoomsAndBeds,
      bookingOptions: defaultBookingOptions,
      selectedAmenities: [],
    });
  };

  const handleAmenityChange = (amenityId) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenityId)
        ? prev.filter((id) => id !== amenityId)
        : [...prev, amenityId]
    );
  };

  return {
    priceBounds,
    priceValues,
    setPriceValues,
    selectedAmenities,
    handleAmenityChange,
    showMoreFacilities,
    setShowMoreFacilities,
    handlePriceChange,
    handleResetFilters,
    roomsAndBeds,
    handleRoomChange,
    bookingOptions,
    handleBookingOptionChange,
    loading,
    error,
    fetchFilteredAccommodations,
  };
}
