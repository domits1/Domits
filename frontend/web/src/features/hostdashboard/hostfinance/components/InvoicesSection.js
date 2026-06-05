import { useEffect, useState } from "react";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { getInvoices } from "../services/invoiceService";

const STATUS_LABEL = { finalized: "Paid", draft: "Draft" };
const FILTER_LABEL = { all: "All", finalized: "Paid", draft: "Draft" };

function formatDate(ms) {
  if (!ms) return "-";
  return new Date(Number(ms)).toLocaleDateString("nl-NL");
}

function formatMoney(amount) {
  return `EUR ${Number(amount).toFixed(2)}`;
}

function InvoicesTableSkeleton({ rows = 4 }) {
  const gridTemplateColumns = "1.1fr 1.3fr 1fr 1fr 0.8fr 0.8fr 0.9fr 0.8fr 0.8fr 0.7fr";

  return (
    <div className="finance-section-loader" aria-hidden="true">
      <div className="finance-skeleton-table">
        <div className="finance-skeleton-table__header" style={{ gridTemplateColumns }}>
          {Array.from({ length: 10 }, (_, index) => (
            <span key={`invoice-header-${index}`} className="finance-skeleton-block finance-skeleton-block--table-cell" />
          ))}
        </div>

        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={`invoice-row-${rowIndex}`} className="finance-skeleton-table__row" style={{ gridTemplateColumns }}>
            {Array.from({ length: 10 }, (_, cellIndex) => (
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

function downloadInvoicePdf(invoice) {
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(20);
    doc.setTextColor(21, 128, 61);
    doc.text("INVOICE", margin, y);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Domits Platform", 140, y);
    y += 6;
    doc.text("domits.com", 140, y);

    y += 14;
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Invoice number: ${invoice.invoice_number}`, margin, y);
    y += 6;
    doc.text(`Date: ${formatDate(invoice.created_at)}`, margin, y);
    y += 6;
    doc.text(`Status: ${STATUS_LABEL[invoice.status] || invoice.status}`, margin, y);

    y += 14;
    doc.setFillColor(21, 128, 61);
    doc.rect(margin, y, 170, 8, "F");
    doc.setTextColor(255);
    doc.setFontSize(10);
    doc.text("Description", margin + 2, y + 5.5);
    doc.text("Nights", 100, y + 5.5);
    doc.text("Rate/night", 120, y + 5.5);
    doc.text("Amount", 158, y + 5.5, { align: "right" });

    y += 12;
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(invoice.property_name || "Accommodation", margin + 2, y);
    doc.text(String(invoice.nights), 100, y);
    doc.text(formatMoney(invoice.rate_per_night), 120, y);
    doc.text(formatMoney(invoice.gross_amount), 158, y, { align: "right" });

    y += 12;
    doc.setDrawColor(200);
    doc.line(margin, y, 190, y);

    y += 8;
    doc.text("Gross amount:", 120, y);
    doc.text(formatMoney(invoice.gross_amount), 190, y, { align: "right" });
    y += 6;
    doc.setTextColor(150);
    doc.text("Platform commission (10%):", 120, y);
    doc.text(`-${formatMoney(invoice.commission_amount)}`, 190, y, { align: "right" });

    y += 8;
    doc.setDrawColor(21, 128, 61);
    doc.line(120, y, 190, y);
    y += 6;
    doc.setFontSize(12);
    doc.setTextColor(21, 128, 61);
    doc.text("Net payout:", 120, y);
    doc.text(formatMoney(invoice.net_amount), 190, y, { align: "right" });

    y += 16;
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Booking: ${invoice.booking_id}`, margin, y);
    y += 5;
    doc.text(`Property: ${invoice.property_id}`, margin, y);
    y += 5;
    doc.text(`Guest: ${invoice.guest_name}`, margin, y);
    y += 5;
    doc.text(`Stay: ${formatDate(invoice.arrival_date)} - ${formatDate(invoice.departure_date)}`, margin, y);

    doc.save(`${invoice.invoice_number}.pdf`);
  });
}

export default function InvoicesSection() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
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
          <table className="payout-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Property</th>
                <th>Guest</th>
                <th>Stay</th>
                <th>Gross</th>
                <th>Commission</th>
                <th>Net payout</th>
                <th>Status</th>
                <th>Date</th>
                <th>Download</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{invoice.property_name}</td>
                  <td>{invoice.guest_name}</td>
                  <td>
                    {formatDate(invoice.arrival_date)} - {formatDate(invoice.departure_date)}
                  </td>
                  <td>{formatMoney(invoice.gross_amount)}</td>
                  <td>{formatMoney(invoice.commission_amount)}</td>
                  <td>
                    <strong>{formatMoney(invoice.net_amount)}</strong>
                  </td>
                  <td>
                    <span className={`invoice-status invoice-status--${invoice.status}`}>
                      {STATUS_LABEL[invoice.status] || invoice.status}
                    </span>
                  </td>
                  <td>{formatDate(invoice.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="invoice-download-btn"
                      onClick={() => downloadInvoicePdf(invoice)}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
