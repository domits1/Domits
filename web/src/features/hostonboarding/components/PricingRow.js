function PricingRow({
  label,
  value,
  onChange,
  type = "number",
  readonly = false,
  placeholder,
}) {
  return (
    <div className="pricing-row">
      <label>{label}</label>
      {readonly ? (
        <p className="pricing-input">€{value.toFixed(2)}</p>
      ) : (
        <input
          className="pricing-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={1}
          step={0.1}
          required
        />
      )}
    </div>
  )
}

export default PricingRow
