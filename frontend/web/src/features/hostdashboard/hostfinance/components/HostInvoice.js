import PropTypes from "prop-types";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import domitsLogoUrl from "../../../../images/logo.svg";
import { HOST_INVOICE_BRANDING } from "../utils/hostInvoiceBranding";
import "./HostInvoice.scss";

const STATUS_LABELS = {
  finalized: "Finalized",
  draft: "Draft",
};

function formatDate(value) {
  if (!value) return null;
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value, currency) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  if (!currency) return amount.toFixed(2);
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(amount);
}

function displayValue(value) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function displayStatus(status) {
  const value = displayValue(status);
  if (!value) return null;
  return STATUS_LABELS[value] || value.charAt(0).toUpperCase() + value.slice(1);
}

function OptionalField({ label, value }) {
  if (!value) return null;
  return (
    <div className="host-invoice__meta-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

OptionalField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
};

function HostInvoice({ invoice, onClose, onDownload, autoPrint = false, onPrintComplete }) {
  const currency = displayValue(invoice.currency);
  const gross = formatMoney(invoice.gross_amount, currency);
  const commission = formatMoney(invoice.commission_amount, currency);
  const net = formatMoney(invoice.net_amount, currency);
  const payoutReference = displayValue(invoice.payout_reference || invoice.payoutReference);
  const propertyName = displayValue(invoice.property_name);
  const bookingId = displayValue(invoice.booking_id);
  const status = displayStatus(invoice.status);
  const invoiceDate = formatDate(invoice.created_at);

  useEffect(() => {
    if (!autoPrint || typeof window.print !== "function") return undefined;

    const handleAfterPrint = () => {
      document.body.classList.remove("host-invoice-printing");
      onPrintComplete?.();
    };

    document.body.classList.add("host-invoice-printing");
    window.addEventListener("afterprint", handleAfterPrint, { once: true });
    const printTimer = window.setTimeout(() => window.print(), 0);

    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.body.classList.remove("host-invoice-printing");
    };
  }, [autoPrint, onPrintComplete]);

  return createPortal(
    (
    <div className="host-invoice-backdrop" role="dialog" aria-modal="true" aria-labelledby="host-invoice-title">
      <div className="host-invoice__controls">
        {onClose ? (
          <button type="button" className="host-invoice__control-button" onClick={onClose}>
            Close
          </button>
        ) : null}
        {onDownload ? (
          <button type="button" className="host-invoice__control-button host-invoice__control-button--primary" onClick={onDownload}>
            Download PDF
          </button>
        ) : null}
      </div>

      <article
        className="host-invoice__document"
        style={{
          "--host-invoice-green": HOST_INVOICE_BRANDING.green,
          "--host-invoice-wave-light": HOST_INVOICE_BRANDING.waveLight,
          "--host-invoice-wave-dark": HOST_INVOICE_BRANDING.waveDark,
        }}
      >
        <header className="host-invoice__header">
          <img className="host-invoice__logo" src={domitsLogoUrl} alt="Domits" />
          <div className="host-invoice__title-block">
            <p className="host-invoice__eyebrow">Domits Finance Suite</p>
            <h1 id="host-invoice-title">INVOICE</h1>
          </div>
        </header>

        <dl className="host-invoice__meta">
          <OptionalField label="Invoice number" value={displayValue(invoice.invoice_number)} />
          <OptionalField label="Invoice date" value={invoiceDate} />
          <OptionalField label="Payout reference" value={payoutReference} />
          <OptionalField label="Invoice status" value={status} />
        </dl>

        {invoice.host_name || invoice.host_company_name || invoice.host_vat_number ? (
          <section className="host-invoice__party-grid" aria-label="Host details">
            <div>
              <p className="host-invoice__section-label">Billed to</p>
              <h2>{invoice.host_company_name || invoice.host_name}</h2>
              {invoice.host_company_name && invoice.host_name ? <p>{invoice.host_name}</p> : null}
              {invoice.host_vat_number ? <p>VAT: {invoice.host_vat_number}</p> : null}
            </div>
          </section>
        ) : null}

        <section className="host-invoice__section" aria-labelledby="host-invoice-booking">
          <div className="host-invoice__section-heading">
            <p className="host-invoice__section-label">Booking summary</p>
            <h2 id="host-invoice-booking">{propertyName || "Property unavailable"}</h2>
          </div>
          <div className="host-invoice__summary-grid">
            <OptionalField label="Property ID" value={displayValue(invoice.property_id)} />
            <OptionalField label="Booking reference" value={bookingId} />
            <OptionalField label="Guest" value={displayValue(invoice.guest_name)} />
            <OptionalField
              label="Stay"
              value={
                formatDate(invoice.arrival_date) && formatDate(invoice.departure_date)
                  ? `${formatDate(invoice.arrival_date)} - ${formatDate(invoice.departure_date)}`
                  : null
              }
            />
            <OptionalField label="Nights" value={displayValue(invoice.nights)} />
            <OptionalField label="Rate per night" value={formatMoney(invoice.rate_per_night, currency)} />
          </div>
        </section>

        <section className="host-invoice__section" aria-labelledby="host-invoice-financials">
          <p className="host-invoice__section-label">Financial summary</p>
          <h2 id="host-invoice-financials" className="sr-only">
            Financial summary
          </h2>
          <table className="host-invoice__financial-table">
            <tbody>
              <tr>
                <th scope="row">Gross earnings</th>
                <td>{gross || "Unavailable"}</td>
              </tr>
              <tr className="host-invoice__deduction">
                <th scope="row">Commission deduction</th>
                <td>{commission ? `-${commission}` : "Unavailable"}</td>
              </tr>
              <tr className="host-invoice__deduction-total">
                <th scope="row">Total deductions</th>
                <td>{commission ? `-${commission}` : "Unavailable"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="host-invoice__net-total" aria-label="Net payout">
          <div>
            <p className="host-invoice__section-label">Net payout</p>
            <p className="host-invoice__net-note">Amount due to the host after recorded deductions</p>
          </div>
          <strong>{net || "Unavailable"}</strong>
        </section>

        <footer className="host-invoice__footer">
          {status ? <p>Payment status: {status}</p> : null}
          {payoutReference ? <p>Payout reference: {payoutReference}</p> : null}
          <p>This document reflects the financial information recorded by Domits at the invoice date.</p>
          <p className="host-invoice__footer-brand">Domits</p>
        </footer>

        <div className="host-invoice__waves" aria-hidden="true">
          <span />
          <span />
        </div>
      </article>
    </div>
    ),
    document.body,
  );
}

HostInvoice.propTypes = {
  invoice: PropTypes.shape({
    invoice_number: PropTypes.string,
    created_at: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    payout_reference: PropTypes.string,
    payoutReference: PropTypes.string,
    host_name: PropTypes.string,
    host_company_name: PropTypes.string,
    host_vat_number: PropTypes.string,
    property_name: PropTypes.string,
    property_id: PropTypes.string,
    booking_id: PropTypes.string,
    guest_name: PropTypes.string,
    arrival_date: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    departure_date: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nights: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rate_per_night: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gross_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    commission_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    net_amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currency: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func,
  onDownload: PropTypes.func,
  autoPrint: PropTypes.bool,
  onPrintComplete: PropTypes.func,
};

export { formatDate, formatMoney };
export default HostInvoice;
