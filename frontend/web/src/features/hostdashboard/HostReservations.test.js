/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HostReservations from "./HostReservations";
import getReservationsFromToken from "./services/getReservationsFromToken.js";

jest.mock("./services/getReservationsFromToken.js", () => jest.fn());
jest.mock("../../services/getAccessToken.js", () => ({ getAccessToken: () => "token" }));
jest.mock("../guestdashboard/services/propertySummaryService", () => ({ fetchPropertySummaries: async () => ({}) }));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const buildReservationsResponse = (statuses) => ({
  response: [
    {
      id: "property-1",
      title: "Test Apartment",
      city: "Amsterdam",
      country: "Netherlands",
      rate: 100,
      photos: [],
      res: {
        response: statuses.map((status, index) => ({
          id: `booking-${index}`,
          status,
          guestname: `Guest ${index}`,
          arrivaldate: "2026-12-10",
          departuredate: "2026-12-12",
        })),
      },
    },
  ],
});

describe("HostReservations status badge", () => {
  // The backend writes both spellings, so both must render the same badge.
  test("shows Cancelled for cancelled bookings in either spelling", async () => {
    getReservationsFromToken.mockResolvedValue(buildReservationsResponse(["Cancelled", "Canceled"]));

    render(
      <MemoryRouter>
        <HostReservations />
      </MemoryRouter>
    );

    await screen.findByText("Guest 1");
    expect(screen.getAllByText("Cancelled")).toHaveLength(2);
  });
});
