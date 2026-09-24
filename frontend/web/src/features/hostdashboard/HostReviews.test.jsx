import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import HostReviews from "./HostReviews";
import useEffectiveHostId from "../../hooks/useEffectiveHostId";
import { fetchHostReviews } from "./services/reviewResponseService";
import { fetchHostPropertySelectOptions } from "./services/hostTaskPropertyService";

// Review: Covers host review loading and property rating comparison behavior.
jest.mock("../../hooks/useEffectiveHostId");
jest.mock("./services/reviewResponseService", () => ({ fetchHostReviews: jest.fn() }));
jest.mock("./services/hostTaskPropertyService", () => ({ fetchHostPropertySelectOptions: jest.fn() }));
jest.mock("./components/ReviewResponseEditor", () => () => null);

describe("HostReviews comparison", () => {
  beforeEach(() => {
    useEffectiveHostId.mockReturnValue({ effectiveHostId: "host-1", loading: false });
    fetchHostReviews.mockResolvedValue([
      {
        id: "review-1", propertyId: "property-a", status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
        title: "Great stay", overallRating: 5, categoryRatings: { cleanliness: 5, accuracy: 4 },
      },
      {
        id: "review-2", propertyId: "property-b", status: "PUBLISHED", reviewType: "GUEST_TO_PROPERTY",
        title: "Good stay", overallRating: 4, categoryRatings: { cleanliness: 3, accuracy: 5 },
      },
    ]);
    fetchHostPropertySelectOptions.mockResolvedValue([
      { value: "property-a", title: "Canal Suite" },
      { value: "property-b", title: "Garden Apartment" },
      { value: "property-c", title: "Unreviewed Loft" },
    ]);
  });

  afterEach(() => jest.clearAllMocks());

  it("shows category averages across managed properties and keeps received reviews available", async () => {
    render(<HostReviews />);

    expect(await screen.findByText("Great stay")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Compare ratings" }));

    const table = await screen.findByRole("table");
    const canalRow = within(table).getByRole("rowheader", { name: /Canal Suite/ }).closest("tr");
    expect(within(within(canalRow).getAllByRole("cell")[1]).getByLabelText("5.0 out of 5")).toBeInTheDocument();
    expect(within(table).getByRole("rowheader", { name: /Unreviewed Loft/ })).toBeInTheDocument();
    expect(fetchHostPropertySelectOptions).toHaveBeenCalledWith("host-1");

    fireEvent.click(screen.getByRole("tab", { name: "Received reviews" }));
    expect(screen.getByText("Great stay")).toBeInTheDocument();
  });

  it("still compares reviewed properties when the listings lookup fails", async () => {
    fetchHostPropertySelectOptions.mockRejectedValue(new Error("Listings unavailable"));
    fetchHostReviews.mockResolvedValue([{
      id: "review-1", propertyId: "property-a", propertyTitle: "Canal Suite",
      status: "PUBLISHED", overallRating: 4, categoryRatings: { cleanliness: 5 },
    }]);

    render(<HostReviews />);
    fireEvent.click(screen.getByRole("tab", { name: "Compare ratings" }));

    expect(await screen.findByRole("rowheader", { name: /Canal Suite/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
