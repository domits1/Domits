import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import GuestBooking from "./GuestBooking";
import { getGuestBookings } from "./services/bookingAPI";
import { fetchPropertySummaries } from "./services/propertySummaryService";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentUserInfo: jest.fn(),
  },
}));
jest.mock("./services/bookingAPI", () => ({
  getGuestBookings: jest.fn(),
}));
jest.mock("./services/propertySummaryService", () => ({
  fetchPropertySummaries: jest.fn(),
}));

const DAY_MS = 24 * 60 * 60 * 1000;

const paidBooking = {
  id: "booking-paid",
  property_id: "property-paris",
  status: "Paid",
  bookingtype: "direct",
  arrivaldate: Date.now() + 30 * DAY_MS,
  departuredate: Date.now() + 33 * DAY_MS,
};

const inquiryBooking = {
  id: "booking-inquiry",
  property_id: "property-bali",
  status: "Inquiry",
  bookingtype: "inquiry",
  arrivaldate: Date.now() + 40 * DAY_MS,
  departuredate: Date.now() + 43 * DAY_MS,
};

const propertySummaries = {
  "property-paris": { title: "Paris Loft", city: "Paris" },
  "property-bali": { title: "Bali Villa", city: "Ubud" },
};

const renderGuestBooking = () =>
  render(
    <MemoryRouter>
      <GuestBooking />
    </MemoryRouter>
  );

describe("GuestBooking inquiry bookings with tabs and search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "guest-1" } });
    getGuestBookings.mockResolvedValue([paidBooking, inquiryBooking]);
    fetchPropertySummaries.mockResolvedValue(propertySummaries);
  });

  test("inquiry bookings show in Requests next to paid bookings under the All tab", async () => {
    renderGuestBooking();

    expect(await screen.findByText("Bali Villa")).toBeInTheDocument();
    expect(screen.getByText("Paris Loft")).toBeInTheDocument();

    const requestsHeading = screen.getByText("Requests");
    const requestsSection = requestsHeading.closest(".guest-booking-summary-grid");
    expect(within(requestsSection).getByText("Bali Villa")).toBeInTheDocument();
    expect(within(requestsSection).queryByText("Paris Loft")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
  });

  test("search filters inquiry bookings by property city and hides Requests when nothing matches", async () => {
    renderGuestBooking();
    await screen.findByText("Bali Villa");

    const searchInput = screen.getByLabelText("Search bookings");

    fireEvent.change(searchInput, { target: { value: "ubud" } });
    expect(screen.getByText("Bali Villa")).toBeInTheDocument();
    expect(screen.getByText("Requests")).toBeInTheDocument();
    expect(screen.queryByText("Paris Loft")).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "paris" } });
    await waitFor(() => expect(screen.queryByText("Bali Villa")).not.toBeInTheDocument());
    expect(screen.queryByText("Requests")).not.toBeInTheDocument();
    expect(screen.getByText("Paris Loft")).toBeInTheDocument();
  });
});
