import domitsLogoUrl from "../../../images/domits-logo.svg";

const PAGE_MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const formatDate = (value) => {
  if (!value) {
    return "unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unavailable";
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = (amount) => `EUR ${Number(amount || 0).toFixed(2)}`;

const normalizeText = (value, fallback = "unavailable") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const buildStayLabel = (receipt) => {
  const arrivalLabel = formatDate(receipt.arrivalDate);
  const departureLabel = formatDate(receipt.departureDate);

  if (arrivalLabel === "unavailable" && departureLabel === "unavailable") {
    return "unavailable";
  }

  return `${arrivalLabel} - ${departureLabel}`;
};

const buildReceiptTitle = (receipt) => {
  const listingName = normalizeText(receipt.title, "Listing");
  const stayLabel = buildStayLabel(receipt);

  if (stayLabel === "unavailable") {
    return `Reservation Receipt - ${listingName}`;
  }

  return `Reservation Receipt - ${listingName} - ${stayLabel}`;
};

const ensureSpace = (doc, cursor, requiredHeight = 10) => {
  if (cursor.y + requiredHeight <= PAGE_HEIGHT - PAGE_MARGIN) {
    return;
  }

  doc.addPage();
  cursor.y = PAGE_MARGIN;
};

const writeMutedText = (doc, text, x, y, options = {}) => {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(options.fontSize || 10);
  doc.setTextColor(100);
  doc.text(String(text || ""), x, y, options.textOptions || {});
};

const writeWrappedValue = (doc, cursor, label, value) => {
  const safeLabel = normalizeText(label, "");
  const safeValue = normalizeText(value);
  ensureSpace(doc, cursor, 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text(`${safeLabel}:`, PAGE_MARGIN, cursor.y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 24, 39);

  const wrappedValue = doc.splitTextToSize(safeValue, 110);
  doc.text(wrappedValue, 72, cursor.y);
  cursor.y += Math.max(8, wrappedValue.length * 5 + 2);
};

const writeSectionHeader = (doc, cursor, title) => {
  ensureSpace(doc, cursor, 14);
  doc.setDrawColor(209, 213, 219);
  doc.line(PAGE_MARGIN, cursor.y, PAGE_WIDTH - PAGE_MARGIN, cursor.y);
  cursor.y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61);
  doc.text(title, PAGE_MARGIN, cursor.y);
  cursor.y += 8;
};

const writeBulletList = (doc, cursor, items) => {
  const safeItems = (Array.isArray(items) ? items : [])
    .map((item) => normalizeText(item, ""))
    .filter(Boolean);

  if (safeItems.length === 0) {
    writeWrappedValue(doc, cursor, "House rules", "No house rules specified");
    return;
  }

  ensureSpace(doc, cursor, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text("House rules:", PAGE_MARGIN, cursor.y);
  cursor.y += 6;

  safeItems.forEach((item) => {
    ensureSpace(doc, cursor, 8);
    const wrappedItem = doc.splitTextToSize(item, CONTENT_WIDTH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("-", PAGE_MARGIN + 2, cursor.y);
    doc.text(wrappedItem, PAGE_MARGIN + 8, cursor.y);
    cursor.y += Math.max(7, wrappedItem.length * 5 + 1);
  });
};

const isAsciiWordCharacter = (character) => {
  const code = character.codePointAt(0);
  if (code === undefined) {
    return false;
  }

  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    code === 95
  );
};

const trimWrappingUnderscores = (value) => {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === "_") {
    start += 1;
  }

  while (end > start && value[end - 1] === "_") {
    end -= 1;
  }

  return value.slice(start, end);
};

const sanitizeFileNameSegment = (value) => {
  const normalizedValue = String(value || "")
    .normalize("NFKD")
    .replaceAll("-", " ");
  let sanitized = "";
  let previousWasSeparator = false;

  for (const character of normalizedValue) {
    if (isAsciiWordCharacter(character)) {
      sanitized += character;
      previousWasSeparator = false;
      continue;
    }

    if (!previousWasSeparator) {
      sanitized += "_";
      previousWasSeparator = true;
    }
  }

  return trimWrappingUnderscores(sanitized);
};

const buildReceiptFileName = (receipt) => {
  const receiptTitle = buildReceiptTitle(receipt);
  const sanitizedTitle = sanitizeFileNameSegment(receiptTitle) || "reservation_receipt";

  return `${sanitizedTitle}.pdf`;
};

const loadImageElement = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const buildLogoDataUrl = async () => {
  try {
    const logoImage = await loadImageElement(domitsLogoUrl);
    const rasterScale = 12;
    const logoWidth = logoImage.naturalWidth || logoImage.width || 16;
    const logoHeight = logoImage.naturalHeight || logoImage.height || 17;
    const canvas = document.createElement("canvas");
    canvas.width = logoWidth * rasterScale;
    canvas.height = logoHeight * rasterScale;

    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(logoImage, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
};

export async function downloadReservationReceiptPdf(receipt) {
  const { jsPDF } = await import("jspdf");
  const logoDataUrl = await buildLogoDataUrl();
  const receiptTitle = buildReceiptTitle(receipt);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cursor = { y: PAGE_MARGIN };
  const logoSize = 18;
  const logoX = PAGE_WIDTH - PAGE_MARGIN - logoSize;
  const logoY = PAGE_MARGIN - 3;
  const logoCenterX = logoX + logoSize / 2;
  const titleWidth = 118;
  const titleLineHeight = 7;
  const metaLineGap = 8;
  const metaTopY = logoY + logoSize + 6;

  doc.setProperties({
    title: receiptTitle,
    subject: "Domits reservation receipt",
    creator: "Domits",
  });

  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      "PNG",
      logoX,
      logoY,
      logoSize,
      logoSize
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(21, 128, 61);
  const wrappedReceiptTitle = doc.splitTextToSize(receiptTitle, titleWidth);
  doc.text(wrappedReceiptTitle, PAGE_MARGIN, cursor.y);
  const titleBottomY =
    PAGE_MARGIN + Math.max(0, wrappedReceiptTitle.length - 1) * titleLineHeight;

  writeMutedText(doc, "Domits host reservation summary", logoCenterX, metaTopY, {
    fontSize: 9,
    textOptions: { align: "center" },
  });
  writeMutedText(doc, `Generated on ${formatDate(Date.now())}`, logoCenterX, metaTopY + metaLineGap, {
    fontSize: 9,
    textOptions: { align: "center" },
  });

  const metaBottomY = metaTopY + metaLineGap;
  cursor.y = Math.max(titleBottomY, metaBottomY) + 12;

  writeWrappedValue(doc, cursor, "Reservation ID", receipt.reservationId);
  writeWrappedValue(doc, cursor, "Confirmation", receipt.confirmationCode);
  writeWrappedValue(doc, cursor, "Status", receipt.statusLabel);
  writeWrappedValue(doc, cursor, "Channel", receipt.channel);
  writeWrappedValue(doc, cursor, "Booked on", formatDate(receipt.bookedOn));

  writeSectionHeader(doc, cursor, "Property");
  writeWrappedValue(doc, cursor, "Property", receipt.title);
  writeWrappedValue(doc, cursor, "Property ID", receipt.propertyId);
  writeWrappedValue(doc, cursor, "Location", receipt.locationLabel);
  writeWrappedValue(doc, cursor, "Stay", buildStayLabel(receipt));
  writeWrappedValue(doc, cursor, "Guests", receipt.guestCountLabel);
  writeWrappedValue(doc, cursor, "Check-in instructions", receipt.checkinInstructions);

  writeSectionHeader(doc, cursor, "Guest");
  writeWrappedValue(doc, cursor, "Guest", receipt.guestName);
  writeWrappedValue(doc, cursor, "Email", receipt.guestEmail);
  writeWrappedValue(doc, cursor, "Phone", receipt.guestPhone);
  writeWrappedValue(doc, cursor, "Special request", receipt.specialRequest);

  writeSectionHeader(doc, cursor, "Payment");
  writeWrappedValue(doc, cursor, "Rate per night", formatMoney(receipt.pricePerNight));
  writeWrappedValue(doc, cursor, "Nights", String(receipt.nights));
  writeWrappedValue(doc, cursor, "Cleaning fee", formatMoney(receipt.cleaningFee));
  writeWrappedValue(doc, cursor, "Total", formatMoney(receipt.total));
  writeWrappedValue(doc, cursor, "Payment status", receipt.paymentStatusLabel);
  writeWrappedValue(doc, cursor, "Payment date", formatDate(receipt.paymentDate));
  writeWrappedValue(doc, cursor, "Payment method", receipt.paymentMethod);

  writeSectionHeader(doc, cursor, "Policies");
  writeWrappedValue(doc, cursor, "Cancellation type", receipt.cancellationType);
  writeWrappedValue(doc, cursor, "Cancellation policy", receipt.cancellationPolicy);
  writeBulletList(doc, cursor, receipt.houseRules);

  ensureSpace(doc, cursor, 14);
  doc.setDrawColor(209, 213, 219);
  doc.line(PAGE_MARGIN, cursor.y, PAGE_WIDTH - PAGE_MARGIN, cursor.y);
  cursor.y += 8;
  writeMutedText(
    doc,
    "This receipt summarizes the reservation as currently stored in Domits.",
    PAGE_MARGIN,
    cursor.y,
    { fontSize: 9 }
  );

  doc.save(buildReceiptFileName(receipt));
}

export default downloadReservationReceiptPdf;
