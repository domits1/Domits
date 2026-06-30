import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ListingDetails2 from "../listingdetails/pages/listingDetails2";
import FetchPropertyById from "../listingdetails/services/fetchPropertyById";

jest.mock("../listingdetails/services/fetchPropertyById", () => jest.fn());
jest.mock("../listingdetails/services/fetchHostInfo", () => jest.fn());
jest.mock("../listingdetails/components/sectionTabs", () => ({ sections }) => (
  <nav data-testid="listing-section-tabs">{sections.map((section) => section.label).join(",")}</nav>
));
jest.mock("../listingdetails/components/header", () => ({ isLoading }) => (
  <div data-testid="listing-header" data-loading={isLoading ? "true" : "false"} />
));
jest.mock("../listingdetails/views/propertyContainer", () => ({ children, isPropertyLoading, isHostLoading }) => (
  <div
    data-testid="property-container"
    data-property-loading={isPropertyLoading ? "true" : "false"}
    data-host-loading={isHostLoading ? "true" : "false"}
  >
    {children}
  </div>
));
jest.mock("../listingdetails/views/bookingContainer", () => ({ isLoading }) => (
  <div data-testid="booking-container" data-loading={isLoading ? "true" : "false"} />
));

describe("ListingDetails2 progressive loading", () => {
  beforeEach(() => {
    FetchPropertyById.mockReset();
    FetchPropertyById.mockReturnValue(new Promise(() => {}));
    global.fetch = jest.fn(() => new Promise(() => {}));
  });

  test("renders the page shell while listing detail data is still loading", () => {
    render(
      <MemoryRouter initialEntries={["/listingdetails?ID=test-property"]}>
        <ListingDetails2 />
      </MemoryRouter>
    );

    expect(screen.getByTestId("listing-section-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("listing-header")).toHaveAttribute("data-loading", "true");
    expect(screen.getByTestId("property-container")).toHaveAttribute("data-property-loading", "true");
    expect(screen.getByTestId("property-container")).toHaveAttribute("data-host-loading", "true");
    expect(screen.getByTestId("booking-container")).toHaveAttribute("data-loading", "true");
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });
});
