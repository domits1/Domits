import { useMemo } from "react"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import countryList from "react-select-country-list"

export const useAddressInput = (accommodationType) => {
  const options = useMemo(() => countryList().getLabels(), [])
  const { accommodationDetails, location, setLocation, setBoatDetails, setCamperDetails } =
    useFormStoreHostOnboarding()

  const details =
    accommodationType === "boat"
      ? accommodationDetails.boatDetails
      : accommodationType === "camper"
        ? accommodationDetails.camperDetails
        : location

  const handleChange =
    accommodationType === "boat"
      ? (value) => {
          setBoatDetails(value)
        }
      : accommodationType === "camper"
        ? (value) => {
            setCamperDetails(value)
          }
        : (value) => {
            setLocation(value)
          }
  return { options, details, handleChange }
}
