import { useState } from "react";
import { MAX_PRICE, MIN_PRICE } from "../../constants/searchFilters";

const FILTER_URL = "https://t0a6yt5e83.execute-api.eu-north-1.amazonaws.com/default/General-Accommodation-FilterFunction";

const appendPositiveNumberParam = (params, key, value) => {
  if (value > 0) {
    params.append(key, value);
  }
};

export default function useFilterLogic(props) {
  const { onFilterApplied } = props || {};

  const [priceValues, setPriceValues] = useState([MIN_PRICE, MAX_PRICE]);

  const [selectedAmenities, setSelectedAmenities] = useState({
    wifi: false,
    parking: false,
    gym: false,
    spa: false,
    swimmingPool: false,
    restaurant: false,
    petFriendly: false,
    airConditioning: false,
    breakfast: false,
    bar: false,
  });

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
    fetchFilteredAccommodations({ roomsAndBeds: nextRoomsAndBeds });
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
    fetchFilteredAccommodations({ bookingOptions: nextBookingOptions });
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchFilteredAccommodations(overrides = {}) {
    const nextPriceValues = overrides.priceValues ?? priceValues;
    const nextRoomsAndBeds = overrides.roomsAndBeds ?? roomsAndBeds;
    const nextBookingOptions = overrides.bookingOptions ?? bookingOptions;

    try {
      setLoading(true);
      setError(null);

      const url = new URL(FILTER_URL);
      url.searchParams.append("minPrice", nextPriceValues[0]);
      url.searchParams.append("maxPrice", nextPriceValues[1]);
      appendPositiveNumberParam(url.searchParams, "bedrooms", nextRoomsAndBeds.bedrooms);
      appendPositiveNumberParam(url.searchParams, "beds", nextRoomsAndBeds.beds);
      appendPositiveNumberParam(url.searchParams, "bathrooms", nextRoomsAndBeds.bathrooms);

      if (nextBookingOptions.bookInstantly && !nextBookingOptions.bookingRequest) {
        url.searchParams.append("bookingType", "direct");
      }

      if (nextBookingOptions.bookingRequest && !nextBookingOptions.bookInstantly) {
        url.searchParams.append("bookingType", "inquiry");
      }

      const response = await fetch(url);
      const data = await response.json();
      const properties = data?.properties ?? [];

      if (properties.length > 0) {
        if (onFilterApplied) {
          onFilterApplied(properties, data?.lastEvaluatedKey ?? null, {
            minPrice: nextPriceValues[0],
            maxPrice: nextPriceValues[1],
            roomsAndBeds: nextRoomsAndBeds,
            bookingOptions: nextBookingOptions,
          });
        }
      } else {
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

  const handleAmenityChange = (event) => {
    setSelectedAmenities({
      ...selectedAmenities,
      [event.target.name]: event.target.checked,
    });
  };

  return {
    priceValues,
    setPriceValues,
    selectedAmenities,
    handleAmenityChange,
    showMoreFacilities,
    setShowMoreFacilities,
    handlePriceChange,
    roomsAndBeds,
    handleRoomChange,
    bookingOptions,
    handleBookingOptionChange,
    loading,
    error,
    fetchFilteredAccommodations,
  };
}
