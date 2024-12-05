import useFormStore from "../stores/formStore";

function GuestAccessTypeSelector({ header, description }) {
    const setGuestAccessType = useFormStore((state) => state.setGuestAccessType);
    const selectedType = useFormStore((state) => state.accommodationDetails.guestAccessType);

  const handleClick = () => {
    setGuestAccessType(header);
  };
  return (
    <div
      className={`${selectedType === header ? "guest-access-item-selected" : "guest-access-item"}`}
      onClick={handleClick}
    >
      <h3 className="guest-access-header">{header}</h3>
      <p>{description}</p>
    </div>
  );
}

export default GuestAccessTypeSelector;
