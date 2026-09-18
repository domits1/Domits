import React from "react";
import PropTypes from "prop-types";

const PriceSavingMessage = ({ saving }) => {
  if (!saving) {
    return null;
  }

  return (
    <div className="price-saving-message">
      ~€{saving.amount} less than {saving.platformLabel}
    </div>
  );
};

PriceSavingMessage.propTypes = {
  saving: PropTypes.shape({
    amount: PropTypes.number,
    platformLabel: PropTypes.string,
  }),
};

export default PriceSavingMessage;
