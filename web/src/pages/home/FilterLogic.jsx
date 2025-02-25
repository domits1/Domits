import { useState } from 'react';

export const FilterLogic = () => {
  const [priceValues, setPriceValues] = useState([15, 400]);

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

  const [selectedRatings, setSelectedRatings] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  const [accommodationResults, setAccommodationResults] = useState([]); // Default to an empty array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFilteredAccommodations = async () => {
    try {
      setLoading(true);
      setError(null);

      const minPrice = priceValues[0];
      const maxPrice = priceValues[1];

      const url = new URL('https://t0a6yt5e83.execute-api.eu-north-1.amazonaws.com/default/General-Accommodation-FilterFunction');
      url.searchParams.append('minPrice', minPrice);
      url.searchParams.append('maxPrice', maxPrice);

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok && data.items) {
        setAccommodationResults(data.items);
      } else {
        throw new Error(data.message || 'Failed to fetch accommodations');
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

  const handleRatingChange = (event) => {
    setSelectedRatings({
      ...selectedRatings,
      [event.target.name]: event.target.checked,
    });
  };

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
    selectedRatings,
    handleRatingChange,
    handlePriceChange,
    accommodationResults, // Include the accommodationResults state
    loading,
    error,
    fetchFilteredAccommodations, // Expose the fetch function
  };
};
