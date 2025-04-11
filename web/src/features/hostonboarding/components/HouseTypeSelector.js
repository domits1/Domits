import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

/**
 * Entire house/room/shared room
 * @param {string} header
 * @param {number} description
 * @returns {JSX.Element}
 */
function HouseTypeSelector({ header, description }) {
  // Currently selected
  const selectedType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.guestAccessType,
  )
  // Set the final type
  const setGuestAccessType = useFormStoreHostOnboarding(
    (state) => state.setHouseType,
  )

  const handleClick = () => {
    setGuestAccessType(header)
  }
  return (
    <div
      className={`${selectedType === header ? "guest-access-item-selected" : "guest-access-item"}`}
      onClick={handleClick}>
      <h3 className="guest-access-header">{header}</h3>
      <p>{description}</p>
    </div>
  )
}

export default HouseTypeSelector
