/**
 * @jest-environment jsdom
 */

import React from "react";
import { act, render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  });

  const monthlyKpis = (overrides = {}) => ({
    revenue: { totalRevenue: 5000 },
    bookedNights: { bookedNights: 10 },
    availableNights: { availableNights: 20 },
    propertyCount: { propertyCount: 2 },
    averageDailyRate: "100.00",
    ...overrides,
  });

  test("shows a computed euro amount when ADR loaded successfully", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue(monthlyKpis());

    render(<HostRevenues />);

    await waitFor(() => expect(screen.getByText("Gross Missed Revenue")).toBeInTheDocument());
    // unbooked nights = 20 - 10 = 10, adr = 100 => 1000
    expect(screen.getByText("€1,000")).toBeInTheDocument();
  });

  test("shows an error instead of zeros when the monthly figures could not be loaded", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue(null);

    render(<HostRevenues />);

    expect(await screen.findByText("Failed to fetch revenue data")).toBeInTheDocument();
    expect(screen.queryByText("Gross Missed Revenue")).not.toBeInTheDocument();
  });

  test("fills every figure from one monthly request instead of one request per figure", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue(monthlyKpis());

    render(<HostRevenues />);

    expect(await screen.findByText("€5,000")).toBeInTheDocument();
    expect(screen.getByText(/10 of 20 nights booked/)).toBeInTheDocument();
    expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(1);
    expect(HostRevenueService.getRevenue).not.toHaveBeenCalled();
    expect(HostRevenueService.getBookedNights).not.toHaveBeenCalled();
    expect(HostRevenueService.getAvailableNights).not.toHaveBeenCalled();
    expect(HostRevenueService.getPropertyCount).not.toHaveBeenCalled();
  });

  test("does not refetch the figures every few seconds while the page stays open", async () => {
    jest.useFakeTimers();
    HostKpiAllService.fetchAll.mockResolvedValue(monthlyKpis());

    render(<HostRevenues />);
    await screen.findByText("€5,000");

    await act(async () => {
      jest.advanceTimersByTime(20000);
    });

    expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test("labels the downloaded report as this month, not the year, and shows the monthly page title", async () => {
    HostKpiAllService.fetchAll.mockResolvedValue(monthlyKpis());
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
