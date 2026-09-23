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
});
