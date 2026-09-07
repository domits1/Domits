import domitsLogoUrl from "../../../../images/logo.svg";
import { formatDate, formatMoney } from "../components/HostInvoice";
import { HOST_INVOICE_BRANDING } from "../utils/hostInvoiceBranding";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 18;
const GREEN = HOST_INVOICE_BRANDING.greenRgb;
const DARK = [17, 24, 39];
const MUTED = [107, 114, 128];

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

async function buildLogoDataUrl() {
  try {
    const image = await loadImageElement(domitsLogoUrl);
    const scale = 4;
    const canvas = document.createElement("canvas");
    canvas.width = (image.naturalWidth || image.width) * scale;
    canvas.height = (image.naturalHeight || image.height) * scale;
    const context = canvas.getContext("2d");
    if (!context) return "";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }

}

const textOrUnavailable = (value) => (value === null || value === undefined || value === "" ? "Unavailable" : String(value));

const invoiceStatus = (value) => {
  if (!value) return null;
  return value === "finalized" ? "Finalized" : String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const writeLabelValue = (doc, label, value, y, x = MARGIN, valueX = 72) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.text(textOrUnavailable(value), valueX, y);
};

const writeMoneyRow = (doc, label, value, y, currency, color = DARK) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.text(label, MARGIN, y);
  doc.text(formatMoney(value, currency) || "Unavailable", PAGE_WIDTH - MARGIN, y, { align: "right" });
};

const addWaveFooter = (doc) => {
  const waveY = PAGE_HEIGHT + HOST_INVOICE_BRANDING.waveHeightMm / 10;
  doc.setFillColor(...HOST_INVOICE_BRANDING.waveLightRgb);
  doc.ellipse(18, waveY, 48, 18, "F");
  doc.setFillColor(...HOST_INVOICE_BRANDING.waveDarkRgb);
  doc.ellipse(PAGE_WIDTH - 8, waveY + 1, 52, 19, "F");
};

export async function downloadHostInvoicePdf(invoice) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = await buildLogoDataUrl();
  const currency = invoice.currency;
  const status = invoiceStatus(invoice.status);
  let y = MARGIN;

  doc.setProperties({
    title: invoice.invoice_number || "Domits invoice",
    subject: "Domits host invoice",
    creator: "Domits Finance Suite",
  });

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", MARGIN, y - 3, 34, 11);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.text("DOMITS FINANCE SUITE", PAGE_WIDTH - MARGIN, y - 3, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...DARK);
  doc.text("INVOICE", PAGE_WIDTH - MARGIN, y + 5, { align: "right" });
  y += 25;

  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  writeLabelValue(doc, "Invoice number", invoice.invoice_number, y);
  y += 7;
  writeLabelValue(doc, "Invoice date", formatDate(invoice.created_at), y);
  y += 7;
  if (invoice.payout_reference || invoice.payoutReference) {
    writeLabelValue(doc, "Payout reference", invoice.payout_reference || invoice.payoutReference, y);
    y += 7;
  }
  if (status) {
    writeLabelValue(doc, "Invoice status", status, y);
  }
  y += 14;

  if (invoice.host_name || invoice.host_company_name || invoice.host_vat_number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text("BILLED TO", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(invoice.host_company_name || invoice.host_name, MARGIN, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (invoice.host_company_name && invoice.host_name) {
      doc.text(invoice.host_name, MARGIN, y);
      y += 5;
    }
    if (invoice.host_vat_number) {
      doc.text(`VAT: ${invoice.host_vat_number}`, MARGIN, y);
      y += 5;
    }
    y += 7;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text("BOOKING SUMMARY", MARGIN, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text(textOrUnavailable(invoice.property_name), MARGIN, y);
  y += 7;
  writeLabelValue(doc, "Property ID", invoice.property_id, y);
  y += 6;
  writeLabelValue(doc, "Booking reference", invoice.booking_id, y);
  y += 6;
  writeLabelValue(doc, "Guest", invoice.guest_name, y);
  y += 6;
  const stay =
    formatDate(invoice.arrival_date) && formatDate(invoice.departure_date)
      ? `${formatDate(invoice.arrival_date)} - ${formatDate(invoice.departure_date)}`
      : null;
  writeLabelValue(doc, "Stay", stay, y);
  y += 6;
  writeLabelValue(doc, "Nights", invoice.nights, y);
  y += 6;
  writeLabelValue(doc, "Rate per night", formatMoney(invoice.rate_per_night, currency), y);
  y += 14;

  doc.setDrawColor(229, 231, 235);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text("FINANCIAL SUMMARY", MARGIN, y);
  y += 9;
  writeMoneyRow(doc, "Gross earnings", invoice.gross_amount, y, currency);
  y += 8;
  writeMoneyRow(doc, "Commission deduction", invoice.commission_amount, y, currency, [180, 35, 24]);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text("Total deductions", MARGIN, y);
  doc.text(formatMoney(invoice.commission_amount, currency) || "Unavailable", PAGE_WIDTH - MARGIN, y, {
    align: "right",
  });
  y += 10;
  doc.setDrawColor(...GREEN);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 10;

  doc.setFillColor(240, 253, 242);
  doc.rect(MARGIN, y - 6, PAGE_WIDTH - MARGIN * 2, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text("NET PAYOUT", MARGIN + 6, y + 2);
  doc.setFontSize(18);
  doc.text(formatMoney(invoice.net_amount, currency) || "Unavailable", PAGE_WIDTH - MARGIN - 6, y + 2, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("Amount due to the host after recorded deductions", MARGIN + 6, y + 9);

  addWaveFooter(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    "This document reflects the financial information recorded by Domits at the invoice date.",
    MARGIN,
    PAGE_HEIGHT - 18,
  );
  if (status) doc.text(`Payment status: ${status}`, MARGIN, PAGE_HEIGHT - 12);
  if (invoice.payout_reference || invoice.payoutReference) {
    doc.text(`Payout reference: ${invoice.payout_reference || invoice.payoutReference}`, MARGIN, PAGE_HEIGHT - 7);
  }
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("Domits Finance Suite", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12, { align: "right" });
  doc.save(`${invoice.invoice_number || "domits-invoice"}.pdf`);
}

export default downloadHostInvoicePdf;
