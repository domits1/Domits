/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import BookingTab from "./BookingTab";
import { getAccessToken } from "../../services/getAccessToken";

jest.mock("../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

const okText = (payload) => ({
  ok: true,
  text: async () => JSON.stringify(payload),
});

const okJson = (payload) => ({
  ok: true,
  json: async () => payload,
});

const accommodation = (title) => ({
  property: { title },
  images: ["cabin.jpg"],
  pricing: { roomRate: 100, cleaning: 25 },
  checkIn: {
    checkIn: { from: 15, till: 22 },
    checkOut: { from: 8, till: 11 },
  },
  location: {
    street: "Main Street",
    houseNumber: "1",
    houseNumberExtension: "",
  },
  Capacity: 4,
  rules: [{ value: false }, { value: false }, { value: false }],
});

describe("BookingTab booking details", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    getAccessToken.mockImplementation((userId) => (userId === "host-1" ? "host-token-1" : "guest-token-1"));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("host BookingTab fetches and displays booking details without bookingId when the match is unambiguous", async () => {
    global.fetch
      .mockResolvedValueOnce(
        okText([
          {
            id: "property-1",
            title: "Host Cabin",
            res: {
              response: [
                {
                  id: "booking-host-1",
                  hostid: "host-1",
                  guestid: "guest-1",
                  property_id: "property-1",
                  arrivaldate: "2026-07-01",
                  departuredate: "2026-07-04",
                  guests: 2,
                  Status: "Accepted",
                },
              ],
            },
          },
        ])
      )
      .mockResolvedValueOnce(okJson(accommodation("Host Cabin")));

    render(<BookingTab userId="host-1" contactId="guest-1" dashboardType="host" propertyId="property-1" />);

    expect(await screen.findByText("Host Cabin")).toBeInTheDocument();
    expect(screen.getByText("Booking Successful")).toBeInTheDocument();
    expect(screen.getByText("Booking ID: booking-host-1")).toBeInTheDocument();
    expect(screen.getByText("$100 x 3 nights")).toBeInTheDocument();

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("readType=hostId"),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "host-token-1" },
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/hostDashboard/single?property=property-1"),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "host-token-1" },
      })
    );
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes("/messages?threadId="))).toBe(false);
  });

  test("guest BookingTab loads the exact bookingId and does not use host/guest pseudo-thread lookup", async () => {
    global.fetch
      .mockResolvedValueOnce(
        okText([
          {
            id: "booking-1",
            guestid: "guest-1",
            hostid: "host-1",
            property_id: "property-1",
            arrivaldate: "2026-08-01",
            departuredate: "2026-08-02",
            guests: 1,
          },
          {
            id: "booking-2",
            guestid: "guest-1",
            hostid: "host-1",
            property_id: "property-2",
            arrivaldate: "2026-09-10",
            departuredate: "2026-09-12",
            guests: 3,
          },
        ])
      )
      .mockResolvedValueOnce(okText(accommodation("Exact Guest Cabin")));

    render(<BookingTab userId="guest-1" contactId="host-1" dashboardType="guest" bookingId="booking-2" />);

    expect(await screen.findByText("Exact Guest Cabin")).toBeInTheDocument();
    expect(screen.getByText("Booking ID: booking-2")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(global.fetch.mock.calls[0][0]).toContain("readType=guest");
    expect(global.fetch.mock.calls[0][0]).toContain("guestId=guest-1");
    expect(global.fetch.mock.calls[1][0]).toContain("bookingId=booking-2");
    expect(global.fetch.mock.calls.some(([url]) => String(url).includes("/messages?threadId="))).toBe(false);
  });
});
