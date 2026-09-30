import React from "react";
import { render, screen } from "@testing-library/react";
import { MissedRevenueCards } from "./MissedRevenueCards";

describe("MissedRevenueCards", () => {
  test("renders one card per entry with its title, value, and meta", () => {
    render(
      <MissedRevenueCards
        cards={[
          { id: "actual-revenue", title: "Actual revenue", value: "EUR 100.00", meta: "Revenue actually booked." },
          {
            id: "potential-revenue",
            title: "Potential revenue",
            value: "EUR 200.00",
            meta: "What could have been earned.",
          },
        ]}
      />
    );

    expect(screen.getByText("Actual revenue")).toBeInTheDocument();
    expect(screen.getByText("EUR 100.00")).toBeInTheDocument();
    expect(screen.getByText("Revenue actually booked.")).toBeInTheDocument();
    expect(screen.getByText("Potential revenue")).toBeInTheDocument();
    expect(screen.getByText("EUR 200.00")).toBeInTheDocument();
  });

  test("renders no cards when given an empty list", () => {
    const { container } = render(<MissedRevenueCards cards={[]} />);

    expect(container.querySelectorAll("article")).toHaveLength(0);
  });

  test("renders the change line when a card has one and omits it otherwise", () => {
    render(
      <MissedRevenueCards
        cards={[
          {
            id: "gross-missed-revenue",
            title: "Gross missed revenue",
            value: "EUR 300.00",
            change: "+5.0% vs previous period",
          },
          { id: "revenue-efficiency", title: "Revenue efficiency", value: "25.0%", change: null },
        ]}
      />
    );

    expect(screen.getByText("+5.0% vs previous period")).toBeInTheDocument();
    expect(screen.getAllByText(/vs previous period/)).toHaveLength(1);
  });
});
