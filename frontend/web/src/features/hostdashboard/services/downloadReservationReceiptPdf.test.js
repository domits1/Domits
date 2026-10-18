/**
 * @jest-environment jsdom
 */

import downloadReservationReceiptPdf from "./downloadReservationReceiptPdf";

// Records every text the receipt writes; any other jsPDF call is a no-op.
const writtenTexts = [];
jest.mock("jspdf", () => ({
  jsPDF: function FakeJsPdf() {
    return new Proxy(
      {
        text: (value) => writtenTexts.push(...[].concat(value)),
        splitTextToSize: (value) => [String(value)],
        getTextWidth: () => 10,
      },
      { get: (target, name) => (name in target ? target[name] : () => {}) }
    );
  },
}));

const receipt = {
  bookingId: "booking-1",
  reservationId: "booking-1",
  confirmationCode: "bookin",
  statusLabel: "Confirmed",
  channel: "Channex",
  title: "Test Apartment",
  arrivalDate: "2026-12-10",
  departureDate: "2026-12-12",
  pricePerNight: 15000,
  nights: 2,
  cleaningFee: 0,
  total: 300,
  paymentStatusLabel: "Collected by the channel",
  paymentMethod: "Paid via BookingCom",
  houseRules: [],
};

describe("downloadReservationReceiptPdf payment section", () => {
  const OriginalImage = global.Image;

  beforeEach(() => {
    writtenTexts.length = 0;
    // jsdom never loads images, so the logo fails fast instead of waiting forever.
    global.Image = class {
      set src(_value) {
        setTimeout(() => this.onerror?.(new Error("no image in tests")));
      }
    };
  });

  afterEach(() => {
    global.Image = OriginalImage;
  });

  // The OTA sends only its total (#3483); a Domits nightly rate next to it would not add up.
  test("leaves out the rate, nights and cleaning fee when the receipt has no price breakdown", async () => {
    await downloadReservationReceiptPdf({ ...receipt, showPriceBreakdown: false });

    expect(writtenTexts).toContain("Total:");
    expect(writtenTexts).not.toContain("Rate per night:");
    expect(writtenTexts).not.toContain("Nights:");
    expect(writtenTexts).not.toContain("Cleaning fee:");
  });

  test("keeps the price breakdown for a Domits booking", async () => {
    await downloadReservationReceiptPdf(receipt);

    expect(writtenTexts).toContain("Rate per night:");
    expect(writtenTexts).toContain("Cleaning fee:");
  });
});
