import PropTypes from "prop-types"

function PricingRow({
  label,
  value,
  onChange,
  type = "number",
  readonly = false,
  placeholder,
  displayValue,
}) {
  return (
    <div className="pricing-row">
      <label>{label}</label>
      {readonly ? (
        <p className="pricing-input">
          {displayValue ?? `EUR ${Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "0.00"}`}
        </p>
      ) : (
        <input
          className="pricing-input"
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
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

PricingRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func,
  type: PropTypes.string,
  readonly: PropTypes.bool,
  placeholder: PropTypes.string,
  displayValue: PropTypes.string,
}

PricingRow.defaultProps = {
  onChange: null,
  type: "number",
  readonly: false,
  placeholder: "",
  displayValue: null,
}
