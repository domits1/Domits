/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import ListingPanel from "./ListingPanel";
import { getAccommodationByPropertyId } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { getAccessToken } from "../../services/getAccessToken";

jest.mock("../../features/hostdashboard/hostmessages/context/AuthContext", () => ({
  useUser: () => ({ accessToken: "id-token-value" }),
}));

jest.mock("../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("../../features/hostdashboard/hostmessages/services/messagingService", () => ({
  getAccommodationByPropertyId: jest.fn(),
}));

describe("ListingPanel authentication token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("access-token-value");
    getAccommodationByPropertyId.mockResolvedValue({});
  });

  test("host listing panel authenticates with the real access token, not the ID token", async () => {
    render(<ListingPanel dashboardType="host" propertyId="property-1" />);

    await waitFor(() => {
      expect(getAccommodationByPropertyId).toHaveBeenCalledWith(
        "hostDashboard/single",
        "property-1",
        "access-token-value"
      );
    });
  });

  test("guest listing panel does not send a token", async () => {
    render(<ListingPanel dashboardType="guest" propertyId="property-1" />);

    await waitFor(() => {
      expect(getAccommodationByPropertyId).toHaveBeenCalledWith(
        "bookingEngine/listingDetails",
        "property-1",
        null
      );
    });
  });
});

describe("ListingPanel when the open thread changes", () => {
  let requests;

  beforeEach(() => {
    jest.clearAllMocks();
    requests = {};
    getAccessToken.mockReturnValue("access-token-value");
    getAccommodationByPropertyId.mockImplementation((_endpoint, propertyId) => {
      let resolve;
      const promise = new Promise((resolvePromise) => {
        resolve = resolvePromise;
      });
      requests[propertyId] = { resolve };
      return promise;
    });
  });

  test("a late answer for the previous thread does not replace the open listing", async () => {
    const { rerender } = render(<ListingPanel dashboardType="host" propertyId="property-1" />);
    rerender(<ListingPanel dashboardType="host" propertyId="property-2" />);

    await act(async () => requests["property-2"].resolve({ property: { title: "Second Cabin" } }));
    await act(async () => requests["property-1"].resolve({ property: { title: "First Cabin" } }));

    expect(screen.getByText("Second Cabin")).toBeInTheDocument();
    expect(screen.queryByText("First Cabin")).not.toBeInTheDocument();
  });

  test("the previous listing is cleared while the next listing loads", async () => {
    const { rerender } = render(<ListingPanel dashboardType="host" propertyId="property-1" />);
    await act(async () => requests["property-1"].resolve({ property: { title: "First Cabin" } }));
    expect(screen.getByText("First Cabin")).toBeInTheDocument();

    rerender(<ListingPanel dashboardType="host" propertyId="property-2" />);

    expect(screen.queryByText("First Cabin")).not.toBeInTheDocument();
    expect(screen.getByText("Listing #property-2")).toBeInTheDocument();
  });
});
