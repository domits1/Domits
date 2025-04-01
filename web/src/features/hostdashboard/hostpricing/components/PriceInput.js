import React from 'react';
import PropTypes from 'prop-types';

const PriceInput = ({ 
  value, 
  onChange, 
  disabled = false, 
  ariaLabel = "Price input",
  className = "",
  step = "0.1"
}) => (
  <input
    type="number"
    step={step}
    value={value || ''}
    onChange={onChange}
    disabled={disabled}
    aria-label={ariaLabel}
    className={className}
    min="0"
  />
);

PriceInput.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  ariaLabel: PropTypes.string,
  className: PropTypes.string,
  step: PropTypes.string
};

export default PriceInput; 