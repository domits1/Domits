/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageContext } from "../../context/LanguageContext";
import HostReservationDetails from "./HostReservationDetails";
import downloadReservationReceiptPdf from "./services/downloadReservationReceiptPdf.js";

// Plain functions, not jest.fn(): the Jest config resets mock implementations before each test.
jest.mock("../../services/getAccessToken.js", () => ({
  getAccessToken: () => null,
  getCognitoUserId: () => null,
}));
jest.mock("../guestdashboard/services/propertySummaryService", () => ({ fetchPropertySummaries: async () => ({}) }));
jest.mock("./services/getReservationsFromToken.js", () => async () => ({}));
jest.mock("react-toastify", () => ({ toast: { error: () => {}, success: () => {} } }));
jest.mock("./services/downloadReservationReceiptPdf.js", () => jest.fn());

const BOOKED_AT = Date.UTC(2026, 9, 13, 12);
const CANCELLED_AT = Date.UTC(2026, 9, 14, 12);

const booking = {
  id: "booking-1",
  status: "Cancelled",
  property_id: "property-1",
  title: "Test Apartment",
  city: "Amsterdam",
  country: "Netherlands",
  rate: 100,
  arrivaldate: "2026-12-10",
  departuredate: "2026-12-12",
  createdat: BOOKED_AT,
  cancelled_at: CANCELLED_AT,
};

const renderDetailsFor = (reservation, language = "en") =>
  render(
    <LanguageContext.Provider value={{ language }}>
      <MemoryRouter initialEntries={[{ pathname: `/reservations/${reservation.id}`, state: { booking: reservation } }]}>
        <Routes>
          <Route path="/reservations/:id" element={<HostReservationDetails />} />
        </Routes>
      </MemoryRouter>
    </LanguageContext.Provider>
  );

const downloadReceiptFor = async (reservation, language = "en") => {
  renderDetailsFor(reservation, language);
  const downloadButton = await screen.findByRole("button", { name: /Download receipt/ });
  await waitFor(() => expect(downloadButton.disabled).toBe(false));
  fireEvent.click(downloadButton);
};

// The date sits in the span right after the payment status text.
const paymentDateNextTo = (statusText) => screen.getByText(statusText).nextElementSibling.textContent;

describe("HostReservationDetails cancel date (#3585)", () => {
  test("a cancelled reservation shows the date it was cancelled, not the booking date", async () => {
    renderDetailsFor(booking);

    await screen.findAllByText("Test Apartment");
    expect(paymentDateNextTo("Reservation cancelled")).toBe("14 Oct");
  });

  test("a cancelled reservation without a known cancel time shows no date", async () => {
    renderDetailsFor({ ...booking, cancelled_at: null });

    await screen.findAllByText("Test Apartment");
    expect(paymentDateNextTo("Reservation cancelled")).toBe("");
  });

  test("a paid reservation still shows the booking date", async () => {
    renderDetailsFor({ ...booking, status: "Paid", cancelled_at: null });

    await screen.findAllByText("Test Apartment");
    expect(paymentDateNextTo("Payment received")).toBe("13 Oct");
  });

  test("the receipt of a cancelled reservation carries the cancel date, labelled as such (#3834)", async () => {
    await downloadReceiptFor(booking);

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentStatusLabel: "Reservation cancelled",
          paymentDate: CANCELLED_AT,
          paymentDateLabel: "Cancelled on",
        })
      )
    );
  });

  test("a cancelled paid booking shows the stored refund status", async () => {
    renderDetailsFor({ ...booking, paymentid: "pi_paid", refund_status: "refunded" });

    await screen.findAllByText("Test Apartment");
    expect(screen.getByText("Refund status")).toBeTruthy();
    expect(screen.getByText("Refunded")).toBeTruthy();
  });

  test.each([
    ["not_refunded", "Not refunded"],
    ["unknown", "Unknown"],
  ])("a cancelled paid booking can show %s", async (refundStatus, expectedText) => {
    renderDetailsFor({ ...booking, paymentid: "pi_paid", refund_status: refundStatus });

    await screen.findAllByText("Test Apartment");
    expect(screen.getByText(expectedText)).toBeTruthy();
  });

  test("a legacy cancelled paid booking without a stored refund status is shown as unknown", async () => {
    renderDetailsFor({ ...booking, paymentid: "pi_paid" });

    await screen.findAllByText("Test Apartment");
    expect(screen.getByText("Unknown")).toBeTruthy();
  });

  test("a cancelled booking without payment evidence does not show a refund status", async () => {
    renderDetailsFor(booking);

    await screen.findAllByText("Test Apartment");
    expect(screen.queryByText("Refund status")).toBeNull();
  });

  test("a cancelled booking with an unpaid PaymentIntent and an empty stored status does not show a refund status", async () => {
    renderDetailsFor({ ...booking, paymentid: "pi_unpaid", refund_status: null });

    await screen.findAllByText("Test Apartment");
    expect(screen.queryByText("Refund status")).toBeNull();
  });

  test("the receipt of a cancelled paid booking includes its refund status", async () => {
    await downloadReceiptFor({ ...booking, paymentid: "pi_paid", refund_status: "refunded" });

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          refundStatusLabel: "Refund status",
          refundStatusText: "Refunded",
        })
      )
    );
  });

  test.each([
    ["en", "Cancelled on"],
    ["nl", "Geannuleerd op"],
    ["de", "Storniert am"],
    ["es", "Fecha de cancelación"],
  ])("the cancelled receipt date label is localized in %s", async (language, expectedLabel) => {
    await downloadReceiptFor(booking, language);

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({ paymentDateLabel: expectedLabel })
      )
    );
  });

  test.each([
    ["en", "Payment date"],
    ["nl", "Betaaldatum"],
    ["de", "Zahlungsdatum"],
    ["es", "Fecha de pago"],
  ])("the payment receipt date label is localized in %s", async (language, expectedLabel) => {
    await downloadReceiptFor({ ...booking, status: "Paid", cancelled_at: null }, language);

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({ paymentDateLabel: expectedLabel })
      )
    );
  });

  test("the receipt of a paid reservation keeps the payment date label", async () => {
    await downloadReceiptFor({ ...booking, status: "Paid", cancelled_at: null });

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatusLabel: "Payment received", paymentDateLabel: "Payment date" })
      )
    );
  });
});
