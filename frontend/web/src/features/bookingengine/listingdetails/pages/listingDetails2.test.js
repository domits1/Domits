import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import ListingDetails2 from "./listingDetails2";
import FetchPropertyById from "../services/fetchPropertyById";
import fetchHostInfo from "../services/fetchHostInfo";

jest.mock("../services/fetchPropertyById");
jest.mock("../services/fetchHostInfo");
jest.mock("../../../hostdashboard/Loading", () => () => <div>Loading</div>);
jest.mock("../components/header", () => () => <div>Header</div>);
jest.mock("../components/sectionTabs", () => () => <div>Tabs</div>);
jest.mock("../views/propertyContainer", () => ({ unavailableDateKeys = [], children }) => (
  <div>
    <div data-testid="property-unavailable-dates">{unavailableDateKeys.join("|")}</div>
    {children}
  </div>
));
jest.mock("../views/bookingContainer", () => ({ unavailableDateKeys = [] }) => (
  <div data-testid="booking-unavailable-dates">{unavailableDateKeys.join("|")}</div>
));

const renderListingDetails = () =>
  render(
    <MemoryRouter initialEntries={["/listingdetails?ID=property-1"]}>
      <ListingDetails2 />
    </MemoryRouter>
  );

const mockProperty = (calendarAvailability = {}) => {
  FetchPropertyById.mockResolvedValue({
    property: {
      id: "property-1",
      hostId: "host-1",
      title: "Demo listing",
    },
    calendarAvailability,
  });
  fetchHostInfo.mockResolvedValue({ name: "Host" });
};

describe("ListingDetails2 availability", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("uses backend unavailable date keys, external blocked dates, and active booking nights", async () => {
    mockProperty({
      externalBlockedDates: ["2026-06-18"],
      unavailableDateKeys: ["2026-06-19"],
    });
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          arrivaldate: "2026-06-15",
          departuredate: "2026-06-17",
        },
      ],
    });

    renderListingDetails();

    await waitFor(() => {
      expect(screen.getByTestId("booking-unavailable-dates")).toHaveTextContent("2026-06-19");
    });

    const unavailableDates = screen.getByTestId("booking-unavailable-dates").textContent;
    expect(unavailableDates).toContain("2026-06-15");
    expect(unavailableDates).toContain("2026-06-16");
    expect(unavailableDates).toContain("2026-06-18");
    expect(unavailableDates).toContain("2026-06-19");
    expect(unavailableDates).not.toContain("2026-06-17");
  });

  test("falls back gracefully when backend unavailable date keys are missing", async () => {
    mockProperty({
      externalBlockedDates: ["2026-06-20"],
    });

    renderListingDetails();

    await waitFor(() => {
      expect(screen.getByTestId("booking-unavailable-dates")).toHaveTextContent("2026-06-20");
    });
  });
});
