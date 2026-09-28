import React from "react";
import { render, screen, within } from "@testing-library/react";
import { MissedRevenueByDate } from "./MissedRevenueByDate";

describe("MissedRevenueByDate", () => {
  test("renders one row per date, in the order given, with its missed revenue", () => {
    render(
      <MissedRevenueByDate
        byDate={[
          { date: "2026-09-02", missedRevenue: 120.5 },
          { date: "2026-09-10", missedRevenue: 80 },
        ]}
      />
    );

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);

    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("2026-09-02")).toBeInTheDocument();
    expect(within(rows[0]).getByText("EUR 120.50")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2026-09-10")).toBeInTheDocument();
    expect(within(rows[1]).getByText("EUR 80.00")).toBeInTheDocument();
  });

  test("shows an empty message instead of a table when no night was missed", () => {
    render(<MissedRevenueByDate byDate={[]} />);

    expect(screen.getByText(/no missed nights/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
