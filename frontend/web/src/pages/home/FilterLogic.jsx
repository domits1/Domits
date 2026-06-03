import { useState } from "react";
import { MAX_PRICE, MIN_PRICE } from "../../constants/searchFilters";

export default function useFilterLogic(props) {
  const [priceValues, setPriceValues] = useState([MIN_PRICE, MAX_PRICE]);
  const { onFilterApplied } = props || {};

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

  const [accommodationResults, setAccommodationResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFilteredAccommodations = async () => {
    try {
      setLoading(true);
      setError(null);

      const minPrice = priceValues[0];
      const maxPrice = priceValues[1];

      const url = new URL(
        "https://t0a6yt5e83.execute-api.eu-north-1.amazonaws.com/default/General-Accommodation-FilterFunction"
      );
      url.searchParams.append("minPrice", minPrice);
      url.searchParams.append("maxPrice", maxPrice);

      const response = await fetch(url);
      const data = await response.json();

      if (data && Array.isArray(data) && data.length > 0) {
        setAccommodationResults(data);

        if (onFilterApplied && typeof onFilterApplied === "function") {
          onFilterApplied(data);
        }
      } else if (Array.isArray(data?.items)) {
        setAccommodationResults(data.items);

        if (onFilterApplied && typeof onFilterApplied === "function") {
          onFilterApplied(data.items);
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
    accommodationResults,
    loading,
    error,
    fetchFilteredAccommodations,
  };
}
