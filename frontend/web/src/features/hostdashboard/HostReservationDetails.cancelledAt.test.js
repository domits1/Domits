/**
 * @jest-environment jsdom
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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

const renderDetailsFor = (reservation) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: `/reservations/${reservation.id}`, state: { booking: reservation } }]}>
      <Routes>
        <Route path="/reservations/:id" element={<HostReservationDetails />} />
      </Routes>
    </MemoryRouter>
  );

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

  test("the receipt of a cancelled reservation carries the cancel date, not the booking date", async () => {
    renderDetailsFor(booking);

    const downloadButton = await screen.findByRole("button", { name: /Download receipt/ });
    await waitFor(() => expect(downloadButton.disabled).toBe(false));
    fireEvent.click(downloadButton);

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({ paymentStatusLabel: "Reservation cancelled", paymentDate: CANCELLED_AT })
      )
    );
  });
});
