import {useMemo} from 'react'
import useFormStore from '../stores/formStore'
import countryList from 'react-select-country-list'

export const useAddressInput = accommodationType => {
  const options = useMemo(() => countryList().getLabels(), [])
  const {accommodationDetails, setBoatDetails, setCamperDetails, setAddress} =
    useFormStore()

  const details =
    accommodationType === 'boat'
      ? accommodationDetails.boatDetails
      : accommodationType === 'camper'
        ? accommodationDetails.camperDetails
        : accommodationDetails.address

  const handleChange =
    accommodationType === 'boat'
      ? value => {
          console.log('Updating Boat Details:', value)
          setBoatDetails(value)
        }
      : accommodationType === 'camper'
        ? value => {
            console.log('Updating Camper Details:', value)
            setCamperDetails(value)
          }
        : value => {
            console.log('Updating General Address:', value)
            setAddress(value)
          }
  return {options, details, handleChange}
}
