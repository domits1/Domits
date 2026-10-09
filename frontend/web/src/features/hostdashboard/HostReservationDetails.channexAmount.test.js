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

const renderDetailsFor = (booking) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: `/reservations/${booking.id}`, state: { booking } }]}>
      <Routes>
        <Route path="/reservations/:id" element={<HostReservationDetails />} />
      </Routes>
    </MemoryRouter>
  );

const channexBooking = {
  id: "booking-1",
  status: "Paid",
  property_id: "property-1",
  title: "Test Apartment",
  city: "Amsterdam",
  country: "Netherlands",
  rate: 15000,
  arrivaldate: "2026-12-10",
  departuredate: "2026-12-12",
  bookingtype: "channex",
  total_price: 300,
  booking_source: "BookingCom",
};

describe("HostReservationDetails payment of a Channex booking (#3483)", () => {
  test("shows the OTA amount and that the channel collected the payment, not a card payment", async () => {
    renderDetailsFor(channexBooking);

    await screen.findAllByText("Test Apartment");
    expect(screen.getByText("€300.00")).toBeTruthy();
    expect(screen.queryByText("€30000.00")).toBeNull();
    expect(screen.getByText("Paid via BookingCom")).toBeTruthy();
    expect(screen.getByText("Collected by the channel")).toBeTruthy();
    expect(screen.queryByText("Card")).toBeNull();
    expect(screen.queryByText("Payment received")).toBeNull();
  });

  test("the receipt carries the OTA total and channel payment, without the Domits price breakdown", async () => {
    renderDetailsFor(channexBooking);

    const downloadButton = await screen.findByRole("button", { name: /Download receipt/ });
    await waitFor(() => expect(downloadButton.disabled).toBe(false));
    fireEvent.click(downloadButton);

    await waitFor(() =>
      expect(downloadReservationReceiptPdf).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 300,
          showPriceBreakdown: false,
          paymentStatusLabel: "Collected by the channel",
          paymentMethod: "Paid via BookingCom",
        })
      )
    );
  });

  test("keeps the card payment texts for a Domits booking", async () => {
    renderDetailsFor({ ...channexBooking, bookingtype: undefined, booking_source: undefined });

    await screen.findAllByText("Test Apartment");
    expect(screen.getByText("Card")).toBeTruthy();
    expect(screen.getByText("Payment received")).toBeTruthy();
  });
});
