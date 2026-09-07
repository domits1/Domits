import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { getInvoices } from "../services/invoiceService";
import HostInvoice from "./HostInvoice";
import { downloadHostInvoicePdf } from "../services/downloadHostInvoicePdf";
import { formatMoney as formatInvoiceMoney } from "./HostInvoice";
import { HOST_INVOICE_FIXTURE_ENABLED, HOST_INVOICE_FIXTURES } from "../utils/hostInvoiceFixtures";

const STATUS_LABEL = { finalized: "Paid", draft: "Draft" };
const FILTER_LABEL = { all: "All", finalized: "Paid", draft: "Draft" };

function formatDate(ms) {
  if (!ms) return "-";
  return new Date(Number(ms)).toLocaleDateString("nl-NL");
}

function InvoicesTableSkeleton({ rows = 4 }) {
  const gridTemplateColumns = "1fr 0.8fr 1.4fr 1fr 1fr 1fr 0.8fr 1.3fr";

  return (
    <div className="finance-section-loader" aria-hidden="true">
      <div className="finance-skeleton-table">
        <div className="finance-skeleton-table__header" style={{ gridTemplateColumns }}>
          {Array.from({ length: 8 }, (_, index) => (
            <span key={`invoice-header-${index}`} className="finance-skeleton-block finance-skeleton-block--table-cell" />
          ))}
        </div>

        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`invoice-row-${rowIndex}`} className="finance-skeleton-table__row" style={{ gridTemplateColumns }}>
            {Array.from({ length: 8 }, (_, cellIndex) => (
              <span
                key={`invoice-row-${rowIndex}-cell-${cellIndex}`}
                className="finance-skeleton-block finance-skeleton-block--table-cell"
              />
            ))}
          </div>
        ))}
      </div>

      <PulseBarsLoader inline message="Loading invoices..." />
    </div>
  );
}

InvoicesTableSkeleton.propTypes = {
  rows: PropTypes.number,
};

export default function InvoicesSection() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    if (HOST_INVOICE_FIXTURE_ENABLED) {
      setInvoices(HOST_INVOICE_FIXTURES);
      setLoading(false);
      return;
    }

    getInvoices()
      .then(setInvoices)
      .catch(() => setError("Failed to load invoices."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? invoices : invoices.filter((invoice) => invoice.status === filter);

  return (
    <div className="invoices-section">
      <h3>Invoices</h3>

      <div className="invoices-filters">
        {["all", "finalized", "draft"].map((value) => (
          <button
            key={value}
            type="button"
            className={`invoices-filter-btn${filter === value ? " active" : ""}`}
            onClick={() => setFilter(value)}
            disabled={loading}
          >
            {FILTER_LABEL[value]}
          </button>
        ))}
      </div>

      {loading ? <InvoicesTableSkeleton /> : null}
      {error ? <p className="invoices-error">{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="invoices-empty">No invoices found.</p>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="table-wrap">
          <table className="payout-table invoices-table">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Invoice</th>
                <th scope="col">Date</th>
                <th scope="col">Property / booking</th>
                <th scope="col" className="amount-column">Gross amount</th>
                <th scope="col" className="amount-column">Deductions</th>
                <th scope="col" className="amount-column">Net payout</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="invoice-number-cell">{invoice.invoice_number || "Unavailable"}</td>
                  <td>{formatDate(invoice.created_at)}</td>
                  <td>
                    <div className="invoice-property-cell">
                      <strong>{invoice.property_name || "Property unavailable"}</strong>
                      <span>Booking: {invoice.booking_id || "Unavailable"}</span>
                    </div>
                  </td>
                  <td className="amount-column">
                    {formatInvoiceMoney(invoice.gross_amount, invoice.currency) || "Unavailable"}
                  </td>
                  <td className="amount-column">
                    {formatInvoiceMoney(invoice.commission_amount, invoice.currency) || "Unavailable"}
                  </td>
                  <td className="amount-column">
                    <strong>{formatInvoiceMoney(invoice.net_amount, invoice.currency) || "Unavailable"}</strong>
                  </td>
                  <td>
                    <span className={`invoice-status invoice-status--${invoice.status}`}>
                      {STATUS_LABEL[invoice.status] || invoice.status || "Unavailable"}
                    </span>
                  </td>
                  <td>
                    <div className="invoice-actions">
                      <button
                        type="button"
                        className="invoice-download-btn"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        View invoice
                      </button>
                      <button
                        type="button"
                        className="invoice-download-btn"
                        onClick={() => downloadHostInvoicePdf(invoice)}
                      >
                        Download PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {selectedInvoice ? (
        <HostInvoice
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onDownload={() => downloadHostInvoicePdf(selectedInvoice)}
        />
      ) : null}
    </div>
  );
}
