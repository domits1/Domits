function LabeledInput({ label, name, value, onChange, placeholder, ...props }) {
    return (
      <>
        <label htmlFor={name}>{label}</label>
        <input
          className="textInput-field locationText"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          id={name}
          {...props}
        />
      </>
    );
  }
  
  export default LabeledInput;