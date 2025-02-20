function AccommodationTypeSelector({
  options,
  icons,
  selectedType,
  onSelectType,
}) {
  return (
    <section className="accommodation-types">
      {options.map((option, index) => (
        <div
          key={index}
          className={`option ${selectedType === option ? 'selected' : ''}`}
          onClick={() => onSelectType(option)}>
          <img
            className="accommodation-icon"
            src={icons[option]}
            alt={option}
          />
          {option}
        </div>
      ))}
    </section>
  )
}

export default AccommodationTypeSelector
