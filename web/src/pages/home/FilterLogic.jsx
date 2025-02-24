import { useState } from 'react';

export const FilterLogic = () => {
  const [priceValues, setPriceValues] = useState([15, 400]);
  
  // Alle mogelijke faciliteiten die een accommodatie kan hebben die op default niet aan zijn
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

  // alle mogelijke soorten accommodaties die een accommodatie kan hebben
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

  //op default staat de optie voor tonen van meer opties op false
  const [showMoreFacilities, setShowMoreFacilities] = useState(false);
  const [showMorePropertyTypes, setShowMorePropertyTypes] = useState(false);

  // zorgt ervoor dat de ingevoerde prijs waarden correct worden bijgewerkt en  voorkomt dat de minimumprijs hoger wordt dan de maximumprijs.
  const handlePriceChange = (index, value) => {
    const newValues = [...priceValues];
    newValues[index] = Number(value);
    if (newValues[0] <= newValues[1]) {
      setPriceValues(newValues);
    }
  };

  // functie om de geselecteerde faciliteiten aan te passen
  const handleFacilityChange = (event) => {
    setSelectedFacilities({
      ...selectedFacilities,
      [event.target.name]: event.target.checked,
    });
  };

  // functie om de geselecteerde soorten accommodaties aan te passen
  const handlePropertyTypeChange = (event) => {
    setSelectedPropertyTypes({
      ...selectedPropertyTypes,
      [event.target.name]: event.target.checked,
    });
  };

  // functie dat de checkoxes voor de ratings op default uit zet
  const [selectedRatings, setSelectedRatings] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  // functie om de geselecteerde ratings aan te passen
  const handleRatingChange = (event) => {
    setSelectedRatings({
      ...selectedRatings,
      [event.target.name]: event.target.checked,
    });
  };
// return alle variabelen en functies die nodig zijn voor de filter bij filterUi.jsx
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
