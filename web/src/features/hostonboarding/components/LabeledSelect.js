import Select from 'react-select'

function LabeledSelect({label, name, value, options, onChange, ...props}) {
  return (
    <>
      <label htmlFor={name}>{label}</label>
      <Select
        options={options}
        name={name}
        value={value}
        onChange={onChange}
        id={name}
        className="locationText"
        {...props}
      />
    </>
  )
}

export default LabeledSelect
