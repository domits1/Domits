/**
 * @jest-environment jsdom
 */

import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import ListingPanel from "./ListingPanel";
import { getAccommodationWithPublicFallback } from "../../features/hostdashboard/hostmessages/services/messagingService";
import { getAccessToken } from "../../services/getAccessToken";

jest.mock("../../features/hostdashboard/hostmessages/context/AuthContext", () => ({
  useUser: () => ({ accessToken: "id-token-value" }),
}));

jest.mock("../../services/getAccessToken", () => ({
  getAccessToken: jest.fn(),
}));

jest.mock("../../features/hostdashboard/hostmessages/services/messagingService", () => ({
  getAccommodationWithPublicFallback: jest.fn(),
}));

const { getAccommodationWithPublicFallback: realGetAccommodationWithPublicFallback } = jest.requireActual(
  "../../features/hostdashboard/hostmessages/services/messagingService"
);

describe("ListingPanel authentication token", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getAccessToken.mockReturnValue("access-token-value");
    getAccommodationWithPublicFallback.mockResolvedValue({});
  });

  test("host listing panel authenticates with the real access token, not the ID token", async () => {
    render(<ListingPanel dashboardType="host" propertyId="property-1" />);

    await waitFor(() => {
      expect(getAccommodationWithPublicFallback).toHaveBeenCalledWith(
        "hostDashboard/single",
        "property-1",
        "access-token-value"
      );
    });
  });

  test("guest listing panel does not send a token", async () => {
    render(<ListingPanel dashboardType="guest" propertyId="property-1" />);

    await waitFor(() => {
      expect(getAccommodationWithPublicFallback).toHaveBeenCalledWith(
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
    getAccommodationWithPublicFallback.mockImplementation((_endpoint, propertyId) => {
      let resolve;
      let reject;
      const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
      });
      requests[propertyId] = { resolve, reject };
      return promise;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  test("a late failure for the previous thread does not show an error on the open listing", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<ListingPanel dashboardType="host" propertyId="property-1" />);
    rerender(<ListingPanel dashboardType="host" propertyId="property-2" />);

    await act(async () => requests["property-2"].resolve({ property: { title: "Second Cabin" } }));
    await act(async () => requests["property-1"].reject(new Error("Failed to fetch accommodation")));

    expect(screen.getByText("Second Cabin")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load listing details.")).not.toBeInTheDocument();
  });

  test("the open listing keeps loading when the previous thread finishes first", async () => {
    const { rerender } = render(<ListingPanel dashboardType="host" propertyId="property-1" />);
    rerender(<ListingPanel dashboardType="host" propertyId="property-2" />);

    await act(async () => requests["property-1"].resolve({ property: { title: "First Cabin" } }));

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("First Cabin")).not.toBeInTheDocument();
  });
});

describe("ListingPanel for a listing the host may not open in the host dashboard", () => {
  const failed = (status) => ({ ok: false, status, json: async () => "Request failed." });
  const listed = (payload) => ({ ok: true, status: 200, json: async () => payload });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "warn").mockImplementation(() => {});
    getAccessToken.mockReturnValue("access-token-value");
    getAccommodationWithPublicFallback.mockImplementation(realGetAccommodationWithPublicFallback);
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("shows the public listing when the host listing answers 403", async () => {
    globalThis.fetch
      .mockResolvedValueOnce(failed(403))
      .mockResolvedValueOnce(listed({ property: { title: "Public Cabin" } }));

    render(<ListingPanel dashboardType="host" propertyId="property-1" />);

    expect(await screen.findByText("Public Cabin")).toBeInTheDocument();
    expect(screen.queryByText("Failed to load listing details.")).not.toBeInTheDocument();
    expect(globalThis.fetch.mock.calls[1][0]).toContain("/bookingEngine/listingDetails?property=property-1");
    expect(globalThis.fetch.mock.calls[1][1].headers).not.toHaveProperty("Authorization");
  });

  test("says the listing could not be loaded when the public listing fails too", async () => {
    globalThis.fetch.mockResolvedValueOnce(failed(403)).mockResolvedValueOnce(failed(404));

    render(<ListingPanel dashboardType="host" propertyId="property-1" />);

    expect(await screen.findByText("Failed to load listing details.")).toBeInTheDocument();
    expect(screen.getByText("Listing #property-1")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("a public answer that arrives after a thread switch does not replace the open listing", async () => {
    let answerFirstPublicListing;
    globalThis.fetch.mockImplementation((url) => {
      if (url.includes("hostDashboard/single?property=property-1")) return Promise.resolve(failed(403));
      if (url.includes("listingDetails?property=property-1")) {
        return new Promise((resolve) => {
          answerFirstPublicListing = () => resolve(listed({ property: { title: "First Cabin" } }));
        });
      }
      return Promise.resolve(listed({ property: { title: "Second Cabin" } }));
    });

    const { rerender } = render(<ListingPanel dashboardType="host" propertyId="property-1" />);
    await waitFor(() => expect(answerFirstPublicListing).toBeDefined());
    rerender(<ListingPanel dashboardType="host" propertyId="property-2" />);
    expect(await screen.findByText("Second Cabin")).toBeInTheDocument();

    await act(async () => answerFirstPublicListing());

    expect(screen.getByText("Second Cabin")).toBeInTheDocument();
    expect(screen.queryByText("First Cabin")).not.toBeInTheDocument();
  });

  test("says the listing could not be loaded on a 401, without asking the public listing", async () => {
    globalThis.fetch.mockResolvedValueOnce(failed(401));

    render(<ListingPanel dashboardType="host" propertyId="property-1" />);

    expect(await screen.findByText("Failed to load listing details.")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
