import React from "react";
import "@testing-library/jest-dom";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Auth } from "aws-amplify";
import GuestBooking from "./GuestBooking";
import { getGuestBookings } from "./services/bookingAPI";
import { fetchPropertySummaries } from "./services/propertySummaryService";

jest.mock("aws-amplify", () => ({
  Auth: { currentUserInfo: jest.fn() },
}));

jest.mock("./services/bookingAPI", () => ({
  getGuestBookings: jest.fn(),
}));

jest.mock("./services/propertySummaryService", () => ({
  fetchPropertySummaries: jest.fn(),
}));

const paidBooking = { id: "booking-paid", property_id: "prop-paid", status: "Paid" };
const cancelledBooking = { id: "booking-cancelled", property_id: "prop-cancelled", status: "Cancelled" };
const inquiryOnlyBooking = { id: "booking-inquiry", property_id: "prop-inquiry-only", status: "Inquiry" };

describe("GuestBooking property detail fetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentUserInfo.mockResolvedValue({ attributes: { sub: "guest-1" } });
    fetchPropertySummaries.mockResolvedValue({});
  });

  test("includes inquiry-only property IDs alongside paid and cancelled bookings", async () => {
    getGuestBookings.mockResolvedValue([paidBooking, cancelledBooking, inquiryOnlyBooking]);

    render(
      <MemoryRouter>
        <GuestBooking />
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchPropertySummaries).toHaveBeenCalled());

    const fetchedIds = fetchPropertySummaries.mock.calls[0][0];
    expect(fetchedIds).toEqual(expect.arrayContaining(["prop-paid", "prop-cancelled", "prop-inquiry-only"]));
  });

  test("still fetches inquiry property IDs when there are no paid or cancelled bookings", async () => {
    getGuestBookings.mockResolvedValue([inquiryOnlyBooking]);

    render(
      <MemoryRouter>
        <GuestBooking />
      </MemoryRouter>
    );

    await waitFor(() => expect(fetchPropertySummaries).toHaveBeenCalled());

    expect(fetchPropertySummaries).toHaveBeenCalledWith(["prop-inquiry-only"]);
  });
});
