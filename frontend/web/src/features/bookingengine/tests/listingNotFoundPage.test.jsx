import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import ListingDetails2 from "../listingdetails/pages/listingDetails2";
import FetchPropertyById from "../listingdetails/services/fetchPropertyById";
import { createListingError, LISTING_NOT_FOUND, LISTING_REQUEST_FAILED } from "../listingdetails/services/listingErrors";

jest.mock("../listingdetails/services/fetchPropertyById", () => jest.fn());
jest.mock("../listingdetails/services/fetchHostInfo", () => jest.fn());
jest.mock("../listingdetails/components/sectionTabs", () => () => <nav />);
jest.mock("../listingdetails/components/header", () => () => <div data-testid="listing-header" />);
jest.mock("../listingdetails/views/propertyContainer", () => ({ children }) => (
  <div data-testid="property-container">{children}</div>
));
jest.mock("../listingdetails/views/bookingContainer", () => () => <div data-testid="booking-container" />);

const robotsContent = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content") || null;

const renderListing = (entry = "/listingdetails?ID=abc") =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <ListingDetails2 />
    </MemoryRouter>
  );

describe("what a visitor and a crawler get for a listing that is gone", () => {
  beforeEach(() => {
    FetchPropertyById.mockReset();
    globalThis.fetch = jest.fn(() => new Promise(() => {}));
  });

  afterEach(() => {
    document.head.querySelectorAll("meta").forEach((element) => element.remove());
  });

  it("shows a clear not found page and asks search engines not to index it", async () => {
    FetchPropertyById.mockRejectedValue(createListingError(LISTING_NOT_FOUND, "gone"));

    renderListing();

    expect(await screen.findByText("This listing is no longer available")).toBeInTheDocument();
    expect(robotsContent()).toBe("noindex");
  });

  it("shows a retryable error for an api failure and never asks for noindex", async () => {
    FetchPropertyById.mockRejectedValue(createListingError(LISTING_REQUEST_FAILED, "boom"));

    renderListing();

    expect(await screen.findByText(/Something went wrong while fetching/)).toBeInTheDocument();
    expect(robotsContent()).toBeNull();
  });

  it("never asks for noindex when the network fails", async () => {
    FetchPropertyById.mockRejectedValue(new TypeError("Failed to fetch"));

    renderListing();

    expect(await screen.findByText(/Something went wrong while fetching/)).toBeInTheDocument();
    expect(robotsContent()).toBeNull();
  });

  it("leaves a healthy listing alone", async () => {
    FetchPropertyById.mockResolvedValue({ property: { id: "abc", title: "Villa Aura", hostId: "host-1" } });

    renderListing();

    await waitFor(() => expect(screen.getByTestId("property-container")).toBeInTheDocument());
    expect(robotsContent()).toBeNull();
    expect(screen.queryByText("This listing is no longer available")).not.toBeInTheDocument();
  });

  it("treats a listing url without an ID as not found", async () => {
    renderListing("/listingdetails");

    expect(await screen.findByText("This listing is no longer available")).toBeInTheDocument();
    expect(robotsContent()).toBe("noindex");
    expect(FetchPropertyById).not.toHaveBeenCalled();
  });

  it("takes the noindex away again when a valid listing is opened afterwards", async () => {
    FetchPropertyById.mockRejectedValue(createListingError(LISTING_NOT_FOUND, "gone"));
    const { unmount } = renderListing();
    expect(await screen.findByText("This listing is no longer available")).toBeInTheDocument();
    expect(robotsContent()).toBe("noindex");
    unmount();

    FetchPropertyById.mockReset();
    FetchPropertyById.mockResolvedValue({ property: { id: "def", title: "Casa Olon", hostId: "host-2" } });
    renderListing("/listingdetails?ID=def");

    await waitFor(() => expect(screen.getByTestId("property-container")).toBeInTheDocument());
    expect(robotsContent()).toBeNull();
  });
});

describe("moving between listings", () => {
  beforeEach(() => {
    FetchPropertyById.mockReset();
    globalThis.fetch = jest.fn(() => new Promise(() => {}));
  });

  afterEach(() => {
    document.head.querySelectorAll("meta").forEach((element) => element.remove());
  });

  it("drops the noindex the moment another listing is opened, before its answer arrives", async () => {
    FetchPropertyById.mockRejectedValue(createListingError(LISTING_NOT_FOUND, "gone"));

    const GoToOtherListing = () => {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/listingdetails?ID=alive")}>
          next listing
        </button>
      );
    };

    render(
      <MemoryRouter initialEntries={["/listingdetails?ID=gone"]}>
        <Routes>
          <Route
            path="/listingdetails"
            element={
              <>
                <GoToOtherListing />
                <ListingDetails2 />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("This listing is no longer available")).toBeInTheDocument();
    expect(robotsContent()).toBe("noindex");

    FetchPropertyById.mockReset();
    FetchPropertyById.mockReturnValue(new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "next listing" }));

    expect(robotsContent()).toBeNull();
    expect(screen.queryByText("This listing is no longer available")).not.toBeInTheDocument();
  });
});
