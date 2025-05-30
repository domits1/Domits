import { useMemo } from "react"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import countryList from "react-select-country-list"

export const useAddressInput = (accommodationType) => {
  const options = useMemo(() => countryList().getLabels(), [])
  const { accommodationDetails, setBoatDetails, setCamperDetails, setAddress } =
    useFormStoreHostOnboarding()

  const details =
    accommodationType === "boat"
      ? accommodationDetails.boatDetails
      : accommodationType === "camper"
        ? accommodationDetails.camperDetails
        : accommodationDetails.address

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
            setAddress(value)
          }
  return { options, details, handleChange }
}
