import { useState } from 'react';

export const FilterLogic = (props) => {
  // [15, 400] are the minimum and maximum price values for the filter
  const [priceValues, setPriceValues] = useState([15, 400]);
  // This callback receives the filtered results and sends them to Accommodations.js
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

  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState({
    apartment: false,
    villa: false,
    bungalow: false,
    studio: false,
    penthouse: false,
    cottage: false,
    townhouse: false,
    cabin: false,
    chalet: false,
    duplex: false,
    mansion: false,
    farmstay: false,
  });

  const [showMoreFacilities, setShowMoreFacilities] = useState(false);
  const [showMorePropertyTypes, setShowMorePropertyTypes] = useState(false);

  const [accommodationResults, setAccommodationResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Retrieves filtered accommodations from the API based on user selections
  // Called when the user clicks 'Apply Filters'
  const fetchFilteredAccommodations = async () => {
    try {
      setLoading(true);
      setError(null);

      const minPrice = priceValues[0];
      const maxPrice = priceValues[1];

      // API endpoint for the filter service
      const url = new URL('https://t0a6yt5e83.execute-api.eu-north-1.amazonaws.com/default/General-Accommodation-FilterFunction');
      url.searchParams.append('minPrice', minPrice);
      url.searchParams.append('maxPrice', maxPrice);

      const response = await fetch(url);
      const data = await response.json();

      // API may return data directly as an array or within an 'items' property
      if (data && Array.isArray(data) && data.length > 0) {
        setAccommodationResults(data);

        if (onFilterApplied && typeof onFilterApplied === 'function') {
          onFilterApplied(data);
        }
      } else if (data && data.items && Array.isArray(data.items)) {
        setAccommodationResults(data.items);

        if (onFilterApplied && typeof onFilterApplied === 'function') {
          onFilterApplied(data.items);
        }
      } else {
        throw new Error('No accommodations found for these criteria');
      }
    } catch (err) {
      setError(err.message);
      console.error("Error fetching accommodations:", err);
    } finally {
      setLoading(false);
    }
  };

  // Ensures that the minimum price is never higher than the maximum price
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

  const handlePropertyTypeChange = (event) => {
    setSelectedPropertyTypes({
      ...selectedPropertyTypes,
      [event.target.name]: event.target.checked,
    });
  };



  // Exposes all necessary state and functions for use in the FilterUi component
  return {
    priceValues,
    setPriceValues,
    selectedFacilities,
    handleFacilityChange,
    selectedPropertyTypes,
    handlePropertyTypeChange,
    showMoreFacilities,
    setShowMoreFacilities,
    showMorePropertyTypes,
    setShowMorePropertyTypes,
    handlePriceChange,
    accommodationResults,
    loading,
    error,
    fetchFilteredAccommodations,
  };
};