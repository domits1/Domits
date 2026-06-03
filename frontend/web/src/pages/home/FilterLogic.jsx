import { useState } from "react";
import { MAX_PRICE, MIN_PRICE } from "../../constants/searchFilters";

export default function useFilterLogic(props) {
  const [priceValues, setPriceValues] = useState([MIN_PRICE, MAX_PRICE]);
  const { onFilterApplied } = props || {};

  const [selectedFacilities, setSelectedFacilities] = useState({
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
        throw new TypeError("No accommodations found for these criteria");
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching accommodations:", err);
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

  const handleFacilityChange = (event) => {
    setSelectedFacilities({
      ...selectedFacilities,
      [event.target.name]: event.target.checked,
    });
  };

  return {
    priceValues,
    setPriceValues,
    selectedFacilities,
    handleFacilityChange,
    showMoreFacilities,
    setShowMoreFacilities,
    handlePriceChange,
    accommodationResults,
    loading,
    error,
    fetchFilteredAccommodations,
  };
}
