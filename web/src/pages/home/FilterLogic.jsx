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

  const [selectedRatings, setSelectedRatings] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

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
  };
};
