import React from 'react'

function AmenityItem({category, amenity, checked, onChange}) {
  return (
    <label>
      <input
        type="checkbox"
        name={amenity}
        checked={checked}
        onChange={e => onChange(category, amenity, e.target.checked)}
      />
      {amenity}
    </label>
  )
}

export default AmenityItem
