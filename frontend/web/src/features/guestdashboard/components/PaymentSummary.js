import React from "react";
import PropTypes from "prop-types";

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function PaymentSummary({ nightlyRate, nights, cleaningFee }) {
  const subtotal = nightlyRate * nights;
  const total = subtotal + cleaningFee;

  return (
    <div className="card">
      <h3>Payment summary</h3>

      <div className="summaryList">
        <div className="paymentRow">
          <span>
            {formatCurrency(nightlyRate)} × {nights} nights
          </span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className="paymentRow">
          <span>Cleaning fee</span>
          <span>{formatCurrency(cleaningFee)}</span>
        </div>

        <div className="paymentRow totalRow">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

PaymentSummary.propTypes = {
  nightlyRate: PropTypes.number.isRequired,
  nights: PropTypes.number.isRequired,
  cleaningFee: PropTypes.number.isRequired,
};

export default PaymentSummary;