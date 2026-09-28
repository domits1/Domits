import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MissedRevenueRootCause } from "./MissedRevenueRootCause";

const ROOT_CAUSE = {
  restriction: { missedRevenue: 120.5, nights: 2 },
  pricing: { missedRevenue: 80, nights: 1 },
  occupancy: { missedRevenue: 300, nights: 4 },
};

describe("MissedRevenueRootCause", () => {
  test("renders one row per cause with its missed revenue and night count", () => {
    render(<MissedRevenueRootCause rootCause={ROOT_CAUSE} />);

    const restrictionRow = screen.getByText(/^Restriction/).closest("tr");
    expect(within(restrictionRow).getByText("EUR 120.50")).toBeInTheDocument();
    expect(within(restrictionRow).getByText("2")).toBeInTheDocument();

    const pricingRow = screen.getByText(/^Pricing/).closest("tr");
    expect(within(pricingRow).getByText("EUR 80.00")).toBeInTheDocument();

    const occupancyRow = screen.getByText(/^Occupancy/).closest("tr");
    expect(within(occupancyRow).getByText("EUR 300.00")).toBeInTheDocument();
    expect(within(occupancyRow).getByText("4")).toBeInTheDocument();
  });

  test("shows an empty message instead of a table when no night was missed", () => {
    const emptyRootCause = {
      restriction: { missedRevenue: 0, nights: 0 },
      pricing: { missedRevenue: 0, nights: 0 },
      occupancy: { missedRevenue: 0, nights: 0 },
    };

    render(<MissedRevenueRootCause rootCause={emptyRootCause} />);

    expect(screen.getByText(/no missed nights/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
