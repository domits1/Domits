import { useEffect, useState } from "react";
import { getInvoices } from "../services/invoiceService";

const STATUS_LABEL = { finalized: "Paid", draft: "Draft" };
const FILTER_LABEL = { all: "All", finalized: "Paid", draft: "Draft" };

function formatDate(ms) {
  if (!ms) return "-";
  return new Date(Number(ms)).toLocaleDateString("nl-NL");
}

function formatMoney(amount) {
  return `€${Number(amount).toFixed(2)}`;
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
    doc.text(`Domits Platform`, 140, y);
    y += 6;
    doc.text(`domits.com`, 140, y);

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
    doc.text(`Stay: ${formatDate(invoice.arrival_date)} – ${formatDate(invoice.departure_date)}`, margin, y);

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

  const filtered = filter === "all" ? invoices : invoices.filter((inv) => inv.status === filter);

  return (
    <div className="invoices-section">
      <h3>Invoices</h3>

      <div className="invoices-filters">
        {["all", "finalized", "draft"].map((f) => (
          <button
            key={f}
            className={`invoices-filter-btn${filter === f ? " active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
      </div>

      {loading && <p className="invoices-loading">Loading invoices...</p>}
      {error && <p className="invoices-error">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="invoices-empty">No invoices found.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
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
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.property_name}</td>
                  <td>{inv.guest_name}</td>
                  <td>{formatDate(inv.arrival_date)} – {formatDate(inv.departure_date)}</td>
                  <td>{formatMoney(inv.gross_amount)}</td>
                  <td>{formatMoney(inv.commission_amount)}</td>
                  <td><strong>{formatMoney(inv.net_amount)}</strong></td>
                  <td>
                    <span className={`invoice-status invoice-status--${inv.status}`}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </span>
                  </td>
                  <td>{formatDate(inv.created_at)}</td>
                  <td>
                    <button
                      className="invoice-download-btn"
                      onClick={() => downloadInvoicePdf(inv)}
                    >
                      PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
