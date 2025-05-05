import { useMemo, useCallback } from "react" // Added useCallback
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
// countryList import is not needed here if AddressInputView handles it
// import countryList from "react-select-country-list"

export const useAddressInput = (accommodationType) => {

  const { accommodationDetails, setBoatDetails, setCamperDetails, setAddress } =
    useFormStoreHostOnboarding()

  const details = useMemo(() => {
    if (accommodationType === "boat") return accommodationDetails.boatDetails;
    if (accommodationType === "camper") return accommodationDetails.camperDetails;
    return accommodationDetails.address;
  }, [accommodationDetails, accommodationType]); // Dependencies look correct

  // Handler for manual input changes from AddressFormFields
  const handleManualInputChange = useCallback(
    (field, value) => { // Receives field name ('country', 'city', 'street', 'zipCode', 'houseNumber', 'houseNumberExtension', 'harbor') and value
      console.log(`Manual Input Change: Field=${field}, Value=${value}`); // Debugging
      const setter =
        accommodationType === "boat"
          ? setBoatDetails
          : accommodationType === "camper"
            ? setCamperDetails
            : setAddress;

      setter(prevDetails => ({
        ...prevDetails,
        [field]: value, // Update the specific field in the store state
      }));
    },
    [accommodationType, setBoatDetails, setCamperDetails, setAddress] // Dependencies look correct
  );

  // Handler for location updates from the map (geocoding result)
  const handleLocationUpdate = useCallback(
    (addressDetails) => {
      console.log("Updating location via Map Click with details:", addressDetails); // Debugging
      const setter =
        accommodationType === "boat"
          ? setBoatDetails
          : accommodationType === "camper"
            ? setCamperDetails
            : setAddress;

      // Map the geocoded addressDetails (Nominatim structure) to your store's structure
      const updatedDetails = {
        // Keep potentially existing manual entries if not provided by geocoding
        // (e.g., harbor, specific house number details might be manual)
        ...details, // Start with existing details from store

        // Overwrite with geocoded data where available
        country: addressDetails.country || details?.country || "",
        city: addressDetails.city || details?.city || "",
        // Combine street and house number from geocoding if house number exists
        street: addressDetails.houseNumber
          ? `${addressDetails.street || ""} ${addressDetails.houseNumber}`.trim()
          : addressDetails.street || details?.street || "",
        // If Nominatim provides separate house number, use it, otherwise clear if street was updated
        houseNumber: addressDetails.houseNumber || (addressDetails.street ? "" : details?.houseNumber || ""),
        houseNumberExtension: "", // Geocoding rarely provides this, clear it or keep existing? Let's clear for now.
        zipCode: addressDetails.zipCode || details?.zipCode || "", // Use zipCode consistently
        latitude: addressDetails.latitude,
        longitude: addressDetails.longitude,
        // Keep existing harbor for boats unless overwritten manually later
        harbor: accommodationType === "boat" ? details?.harbor : undefined,
      };

      // Clear fields that might be irrelevant after map click for non-boats
      if(accommodationType !== 'boat') {
        delete updatedDetails.harbor;
      } else {
        // For boats, ensure street/number/zip are cleared or handled if needed
        // Maybe clear standard address fields if harbor is the primary identifier? Depends on requirements.
        // updatedDetails.street = "";
        // updatedDetails.houseNumber = "";
        // updatedDetails.houseNumberExtension = "";
        // updatedDetails.zipCode = "";
      }


      setter(updatedDetails);
    },
    [accommodationType, setBoatDetails, setCamperDetails, setAddress, details] // Include 'details' in dependency array
  );


  return {
    details,
    handleLocationUpdate,
    handleManualInputChange
  };
};