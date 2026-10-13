/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HostReservations from "./HostReservations";
import getReservationsFromToken from "./services/getReservationsFromToken.js";

// Plain functions, not jest.fn(): the Jest config resets mock implementations before each test.
jest.mock("./services/getReservationsFromToken.js", () => jest.fn());
jest.mock("../../services/getAccessToken.js", () => ({ getAccessToken: () => "token" }));
jest.mock("../guestdashboard/services/propertySummaryService", () => ({ fetchPropertySummaries: async () => ({}) }));
jest.mock("react-toastify", () => ({ toast: { error: () => {}, success: () => {} } }));

const reservationsResponse = (reservations) => ({
  response: [
    {
      id: "property-1",
      title: "Test Apartment",
      city: "Amsterdam",
      country: "Netherlands",
      rate: 15000,
      photos: [],
      res: { response: reservations },
    },
  ],
});

const twoNights = { status: "Paid", arrivaldate: "2026-12-10", departuredate: "2026-12-12" };

const renderList = async (reservations) => {
  getReservationsFromToken.mockResolvedValue(reservationsResponse(reservations));
  render(
    <MemoryRouter>
      <HostReservations />
    </MemoryRouter>
  );
  return screen.findByText("Guest A");
};

const rowOf = (guestName) => screen.getByText(guestName).closest("tr");

describe("HostReservations totals of Channex bookings (#3483)", () => {
  test("shows the amount paid on the OTA and no Domits commission", async () => {
    await renderList([
      { ...twoNights, id: "b-1", guestname: "Guest A", bookingtype: "channex", total_price: 300 },
    ]);

    const row = within(rowOf("Guest A"));
    expect(row.getByText("€300")).toBeTruthy();
    expect(row.queryByText("€30000")).toBeNull();
    expect(within(row.getByText("€300").closest("tr")).getAllByText("–").length).toBeGreaterThan(0);
  });

  test("keeps the calculated total and commission for a Domits booking", async () => {
    await renderList([{ ...twoNights, id: "b-1", guestname: "Guest A", total_price: 300 }]);

    const row = within(rowOf("Guest A"));
    expect(row.getByText("€30000")).toBeTruthy();
    expect(row.getByText("€3000.00")).toBeTruthy();
  });

  test("falls back to the calculated total when a Channex booking has no stored amount", async () => {
    await renderList([{ ...twoNights, id: "b-1", guestname: "Guest A", bookingtype: "channex", total_price: null }]);

    expect(within(rowOf("Guest A")).getByText("€30000")).toBeTruthy();
  });
});
