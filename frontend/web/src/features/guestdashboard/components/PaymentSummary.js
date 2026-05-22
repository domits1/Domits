import React, { useContext } from "react";
import PropTypes from "prop-types";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function PaymentSummary({ nightlyRate, nights, cleaningFee }) {
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;
  const subtotal = nightlyRate * nights;
  const total = subtotal + cleaningFee;

  return (
    <div className="card">
      <h3>{t?.paymentSummary?.title || "Payment summary"}</h3>

      <div className="summaryList">
        <div className="paymentRow">
          <span>
            {formatCurrency(nightlyRate)} x {nights} {t?.paymentSummary?.nights || "nights"}
          </span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        <div className="paymentRow">
          <span>{t?.paymentSummary?.cleaningFee || "Cleaning fee"}</span>
          <span>{formatCurrency(cleaningFee)}</span>
        </div>

        <div className="paymentRow totalRow">
          <span>{t?.paymentSummary?.total || "Total"}</span>
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
