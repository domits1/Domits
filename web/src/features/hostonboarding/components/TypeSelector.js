function AccommodationTypeSelector({
  options,
  icons,
  selectedType,
  onSelectType,
}) {
  return (
    <section className="accommodation-types vertical-list bordered-list">
      {options.map((option, index) => (
        <div
          key={index}
          className={`option ${selectedType === option ? "selected" : ""}`}
          onClick={() => onSelectType(option)}
        >
          <img
            className="accommodation-icon"
            src={icons[option]}
            alt={option}
          />
          <span className="option-text">{option}</span>
        </div>
      ))}
    </section>
  );
}

export default AccommodationTypeSelector;
