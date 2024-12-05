import { useMemo } from "react";
import useFormStore from "../stores/formStore";
import countryList from "react-select-country-list";

export const useAddressInput = ({ accommodationType }) => {
  const options = useMemo(() => countryList().getLabels(), []);
  const { accommodationDetails, setBoatDetails, setCamperDetails, setAddress } =
    useFormStore();

  const details =
    accommodationType === "boat"
      ? accommodationDetails.boatDetails
      : accommodationType === "camper"
      ? accommodationDetails.camperDetails
      : accommodationDetails.address;

  const handleChange =
    accommodationType === "boat"
      ? setBoatDetails
      : accommodationType === "camper"
      ? setCamperDetails
      : setAddress;
  return { options, details, handleChange };
};
