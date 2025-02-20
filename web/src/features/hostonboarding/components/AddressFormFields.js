import React from 'react'
import LabeledSelect from './LabeledSelect'
import LabeledInput from './LabeledInput'

function AddressFormFields({type, details, handleChange, countryOptions}) {
  switch (type) {
    case 'boat':
      return (
        <>
          <LabeledSelect
            label="Country of Registration*"
            name="country"
            options={countryOptions}
            value={{value: details.country, label: details.country || ''}}
            onChange={option => handleChange({country: option.value})}
            required
          />
          <LabeledInput
            label="City*"
            name="city"
            value={details.city || ''}
            onChange={e => handleChange({city: e.target.value})}
            placeholder="Enter the city"
            required
          />
          <LabeledInput
            label="Harbor*"
            name="harbor"
            value={details.harbor || ''}
            onChange={e => handleChange({harbor: e.target.value})}
            placeholder="Enter the harbor name"
            required
          />
        </>
      )
    case 'camper':
      return (
        <>
          <LabeledSelect
            label="Country*"
            name="country"
            options={countryOptions}
            value={{value: details.country, label: details.country || ''}}
            onChange={option => handleChange({country: option.value})}
            required
          />
          <LabeledInput
            label="City*"
            name="city"
            value={details.city || ''}
            onChange={e => handleChange({city: e.target.value})}
            placeholder="Enter the city"
            required
          />
          <LabeledInput
            label="Street + house nr.*"
            name="street"
            value={details.street || ''}
            onChange={e => handleChange({street: e.target.value})}
            placeholder="Enter your address"
            required
          />
          <LabeledInput
            label="Postal Code*"
            name="zipCode"
            value={details.zipCode || ''}
            onChange={e => handleChange({zipCode: e.target.value})}
            placeholder="Enter your postal code"
            required
          />
        </>
      )
    default:
      return (
        <>
          <LabeledSelect
            label="Country*"
            name="country"
            options={countryOptions}
            value={{value: details.country, label: details.country || ''}}
            onChange={option => handleChange({country: option.value})}
            required
          />
          <LabeledInput
            label="City*"
            name="city"
            value={details.city || ''}
            onChange={e => handleChange({city: e.target.value})}
            placeholder="Select your city"
            required
          />
          <LabeledInput
            label="Street + house nr.*"
            name="street"
            value={details.street || ''}
            onChange={e => handleChange({street: e.target.value})}
            placeholder="Enter your address"
            required
          />
          <LabeledInput
            label="Postal Code*"
            name="zipCode"
            value={details.zipCode || ''}
            onChange={e => handleChange({zipCode: e.target.value})}
            placeholder="Enter your postal code"
            required
          />
        </>
      )
  }
}

export default AddressFormFields
