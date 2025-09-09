import { useState } from "react";

export default function (props) {
  const [priceValues, setPriceValues] = useState([15, 400]);
  const { onFilterApplied } = props || {};

  const [ecoScore, setEcoScore] = useState({
    "Star 1": false,
    "Star 2": false,
    "Star 3": false,
    "Star 4": false,
    "Star 5": false,
  });

  const [seasonFilter, setSeasonFilter] = useState({
    Spring: false,
    Summer: false,
    Autumn: false,
    Winter: false,
    Fall: false,
    Easter: false,
    Christmas: false,
    LowSeason: false,
    HighSeason: false,
  });

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

  const [showMoreSeasonTypes, setShowMoreSeasonTypes] = useState(false);

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
      } else if (data && data.items && Array.isArray(data.items)) {
        setAccommodationResults(data.items);

        if (onFilterApplied && typeof onFilterApplied === "function") {
          onFilterApplied(data.items);
        }
      } else {
        throw new Error("No accommodations found for these criteria");
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

  const handlePropertyTypeChange = (event) => {
    setSelectedPropertyTypes({
      ...selectedPropertyTypes,
      [event.target.name]: event.target.checked,
    });
  };

  const handleSeasonChange = (event) => {
    setSeasonFilter({
      ...seasonFilter,
      [event.target.name]: event.target.checked,
    });
  };

  const handleEcoChange = (event) => {
    setEcoScore({
      ...ecoScore,
      [event.target.name]: event.target.checked,
    })
  }

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
    handleSeasonChange,
    seasonFilter,
    setSeasonFilter,
    showMoreSeasonTypes,
    setShowMoreSeasonTypes,
    handleEcoChange,
    ecoScore,
    setEcoScore,
  };
}
