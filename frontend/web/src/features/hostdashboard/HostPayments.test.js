/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Auth } from "aws-amplify";
import HostRevenues from "./HostPayments";
import { HostRevenueService } from "./services/HostRevenueService.js";
import { HostKpiAllService } from "./services/HostKpiAllService.js";

jest.mock("aws-amplify", () => ({
  Auth: {
    currentAuthenticatedUser: jest.fn(),
    currentSession: jest.fn(),
  },
}));

jest.mock("./services/HostRevenueService.js", () => ({
  HostRevenueService: {
    getRevenue: jest.fn(),
    getBookedNights: jest.fn(),
    getAvailableNights: jest.fn(),
    getPropertyCount: jest.fn(),
  },
}));

jest.mock("./services/HostKpiAllService.js", () => ({
  HostKpiAllService: {
    fetchAll: jest.fn(),
  },
}));

jest.mock("./HostRevenueCards/MonthlyComparison.jsx", () => () => <div data-testid="monthly-comparison" />);

describe("HostRevenues gross missed revenue display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Auth.currentAuthenticatedUser.mockResolvedValue({ attributes: { sub: "host-1" } });
    Auth.currentSession.mockResolvedValue({});
    HostRevenueService.getRevenue.mockResolvedValue(5000);
    HostRevenueService.getBookedNights.mockResolvedValue(10);
    HostRevenueService.getAvailableNights.mockResolvedValue(20);
    HostRevenueService.getPropertyCount.mockResolvedValue(2);
  });

  test("shows a computed euro amount when ADR loaded successfully", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue({ averageDailyRate: 100 });

    render(<HostRevenues />);

    await waitFor(() => expect(screen.getByText("Gross Missed Revenue")).toBeInTheDocument());
    // unbooked nights = 20 - 10 = 10, adr = 100 => 1000
    expect(screen.getByText("€1,000")).toBeInTheDocument();
  });

  test("shows a dash instead of €0 when the ADR fetch failed", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue(null);

    render(<HostRevenues />);

    await waitFor(() => expect(screen.getByText("Gross Missed Revenue")).toBeInTheDocument());
    expect(screen.getByText("–")).toBeInTheDocument();
    expect(screen.queryByText("€0")).not.toBeInTheDocument();
  });

  test("labels the downloaded report as this month, not the year, and shows the monthly page title", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue({ averageDailyRate: 100 });
    URL.createObjectURL = jest.fn(() => "blob:mock");
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<HostRevenues />);
    await waitFor(() => expect(screen.getByText("Gross Missed Revenue")).toBeInTheDocument());

    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();

    let capturedAnchor;
    const realAppendChild = document.body.appendChild.bind(document.body);
    const appendSpy = jest.spyOn(document.body, "appendChild").mockImplementation((node) => {
      if (node.tagName === "A") capturedAnchor = node;
      return realAppendChild(node);
    });

    fireEvent.click(screen.getByRole("button", { name: "Download Report" }));

    expect(capturedAnchor.download).toMatch(/^monthly-revenue-report-[a-z]+-\d{4}\.csv$/);
    expect(capturedAnchor.download).not.toMatch(/^yearly-revenue-report/);

    appendSpy.mockRestore();
  });
});
