
function AccommodationTypeSelector( {
  options,
  icons,
  labels = {},
  selectedType,
  onSelectType,
}) {
  return (
    <section className="accommodation-types">
      {options.map((option, index) => (
        <div
          key={index}
          className={`option ${selectedType === option ? "selected" : ""}`}
          onClick={() => onSelectType(option)}
        >
          <img
            className="accommodation-icon"
            src={icons[option]}
            alt={labels[option] ?? option}
          />
          {labels[option] ?? option}
        </div>
      ))}
    </section>
  );
}

export default AccommodationTypeSelector;
