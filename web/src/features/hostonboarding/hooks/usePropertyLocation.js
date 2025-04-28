import { useMemo, useCallback } from "react" // Added useCallback
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import countryList from "react-select-country-list"

export const useAddressInput = (accommodationType) => {
  // options might not be needed here, AddressInputView uses countryList directly
  // const options = useMemo(() => countryList().getLabels(), [])

  const { accommodationDetails, setBoatDetails, setCamperDetails, setAddress } =
    useFormStoreHostOnboarding()

  const details = useMemo(() => {
    return accommodationType === "boat"
      ? accommodationDetails.boatDetails
      : accommodationType === "camper"
        ? accommodationDetails.camperDetails
        : accommodationDetails.address;
  }, [accommodationDetails, accommodationType]); // Added dependencies

  // This handler is for manual input changes in the form fields
  const handleManualInputChange = useCallback(
    (field, value) => { // Assuming manual input handler takes field name and value
      const setter =
        accommodationType === "boat"
          ? setBoatDetails
          : accommodationType === "camper"
            ? setCamperDetails
            : setAddress;

      setter(prevDetails => ({
        ...prevDetails,
        [field]: value,
      }));
    },
    [accommodationType, setBoatDetails, setCamperDetails, setAddress] // Added dependencies
  );

  // This handler is for location updates from the map (geocoding result)
  const handleLocationUpdate = useCallback(
    (addressDetails) => {
      console.log("Updating location with details:", addressDetails); // Debugging
      const setter =
        accommodationType === "boat"
          ? setBoatDetails
          : accommodationType === "camper"
            ? setCamperDetails
            : setAddress;

      // Map the geocoded addressDetails structure to your store's structure
      // Nominatim structure: { street, houseNumber, city, zipCode, country, latitude, longitude, ... }
      // Your store structure: { street, city, zipCode, country, latitude, longitude, harbor }
      const updatedDetails = {
        ...addressDetails, // Include latitude, longitude, street, city, zipCode, country
        // Keep existing harbor if it exists, map doesn't provide it
        harbor: accommodationType === "boat" ? details?.harbor : undefined,
        // If needed, combine street and houseNumber for the street field
        street: addressDetails.houseNumber ? `${addressDetails.street} ${addressDetails.houseNumber}` : addressDetails.street,
        // Ensure zipCode is correctly mapped if needed
        zipCode: addressDetails.zipCode || '',
      };

      setter(updatedDetails);
    },
    [accommodationType, setBoatDetails, setCamperDetails, setAddress, details] // Added dependencies
  );


  return {
    details,
    handleLocationUpdate, // Now returned
    handleManualInputChange // Now returned under the expected name
    // options is not returned as AddressInputView calculates it independently
  };
};