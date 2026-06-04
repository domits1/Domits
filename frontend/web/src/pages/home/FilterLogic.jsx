import { useState } from "react";
import { MAX_PRICE, MIN_PRICE } from "../../constants/searchFilters";

const FILTER_URL = "https://t0a6yt5e83.execute-api.eu-north-1.amazonaws.com/default/General-Accommodation-FilterFunction";

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
    setRoomsAndBeds((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const [bookingOptions, setBookingOptions] = useState({
    bookInstantly: false,
    bookingRequest: false,
  });

  const handleBookingOptionChange = (event) => {
    setBookingOptions((prev) => ({
      ...prev,
      [event.target.name]: event.target.checked,
    }));
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFilteredAccommodations = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(FILTER_URL);
      url.searchParams.append("minPrice", priceValues[0]);
      url.searchParams.append("maxPrice", priceValues[1]);

      const response = await fetch(url);
      const data = await response.json();
      const properties = data?.properties ?? [];

      if (properties.length > 0) {
        if (onFilterApplied) {
          onFilterApplied(properties, data?.lastEvaluatedKey ?? null, {
            minPrice: priceValues[0],
            maxPrice: priceValues[1],
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
  };

  const handlePriceChange = (index, value) => {
    const newValues = [...priceValues];
    newValues[index] = Number(value);
    if (newValues[0] <= newValues[1]) {
      setPriceValues(newValues);
    }
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
