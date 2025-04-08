// --- START OF FILE usePropertyLocation.js ---

import { useMemo } from "react";
import useFormStore from "../stores/formStore";
// No longer need countryList here unless used elsewhere
// import countryList from "react-select-country-list";

export const useAddressInput = (accommodationType) => {
    // const options = useMemo(() => countryList().getLabels(), []); // Keep if needed for other selects
    const { accommodationDetails, setBoatDetails, setCamperDetails, setAddress } =
        useFormStore();

    const details = useMemo(() => {
        switch (accommodationType) {
            case "boat":
                return accommodationDetails.boatDetails;
            case "camper":
                return accommodationDetails.camperDetails;
            default:
                return accommodationDetails.address;
        }
    }, [accommodationType, accommodationDetails]);

    // This function will be called by the map's onLocationSelect callback
    const handleLocationUpdate = useMemo(() => {
        switch (accommodationType) {
            case "boat":
                return (value) => {
                    console.log("Updating Boat Details from Map:", value);
                    // Merge geocoded address with potentially existing manual harbor input
                    const currentDetails = useFormStore.getState().accommodationDetails.boatDetails;
                    setBoatDetails({
                        country: value.country || currentDetails.country || '',
                        city: value.city || currentDetails.city || '',
                        // Keep harbor separate - it's not typically geocoded
                        // harbor: value.harbor || currentDetails.harbor || '', // Decide if geocoding should overwrite harbor
                        latitude: value.latitude,
                        longitude: value.longitude,
                        // Include other fields if geocoding provides them (e.g., street, postcode - unlikely for boats)
                    });
                };
            case "camper":
                return (value) => {
                    console.log("Updating Camper Details from Map:", value);
                    // Combine street and house number if geocoding provided them separately
                    const streetAddress = [value.street, value.houseNumber].filter(Boolean).join(' ');
                    setCamperDetails({
                        country: value.country || '',
                        city: value.city || '',
                        street: streetAddress || '',
                        zipCode: value.zipCode || '',
                        latitude: value.latitude,
                        longitude: value.longitude,
                    });
                };
            default: // House, Apartment etc.
                return (value) => {
                    console.log("Updating General Address from Map:", value);
                    // Combine street and house number if geocoding provided them separately
                    const streetAddress = [value.street, value.houseNumber].filter(Boolean).join(' ');
                    setAddress({
                        country: value.country || '',
                        city: value.city || '',
                        street: streetAddress || '',
                        zipCode: value.zipCode || '',
                        latitude: value.latitude,
                        longitude: value.longitude,
                    });
                };
        }
    }, [accommodationType, setAddress, setBoatDetails, setCamperDetails]);


    // The old handleChange might still be needed if you keep AddressFormFields editable
    const handleManualInputChange = useMemo(() => {
        switch (accommodationType) {
            case "boat": return setBoatDetails;
            case "camper": return setCamperDetails;
            default: return setAddress;
        }
    }, [accommodationType, setAddress, setBoatDetails, setCamperDetails]);


    // Return details and the update function for the map
    // Also return the manual change handler if needed
    return { details, handleLocationUpdate, handleManualInputChange /*, options */ };
};
// --- END OF FILE usePropertyLocation.js ---