import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MissedRevenueDashboardPage from "./MissedRevenueDashboardPage";
import { fetchMissedRevenue } from "./services/missedRevenueService";
import { EMPTY_MISSED_REVENUE } from "./missedRevenueFields";

jest.mock("./services/missedRevenueService", () => ({
  fetchMissedRevenue: jest.fn(),
}));

const CONNECTED_DATA = {
  ...EMPTY_MISSED_REVENUE,
  connected: true,
  actualRevenue: 100,
  potentialRevenue: 400,
  grossMissedRevenue: 300,
  revenueEfficiencyPct: 25,
  byProperty: [
    { propertyId: "prop-1", missedRevenue: 300, actualRevenue: 100, potentialRevenue: 400, potentialOccupiedNights: 4 },
  ],
};

describe("MissedRevenueDashboardPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("shows a loading state before the data arrives", () => {
    fetchMissedRevenue.mockReturnValue(new Promise(() => {}));

    render(<MissedRevenueDashboardPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test("renders current month, previous month, and YTD sections with cards after loading", async () => {
    fetchMissedRevenue.mockResolvedValue(CONNECTED_DATA);

    render(<MissedRevenueDashboardPage />);

    await waitFor(() => expect(screen.getByText("Current month")).toBeInTheDocument());

    expect(screen.getByText("Previous month")).toBeInTheDocument();
    expect(screen.getByText("Year to date")).toBeInTheDocument();
    expect(fetchMissedRevenue).toHaveBeenCalledTimes(3);
    expect(screen.getAllByText("EUR 100.00").length).toBeGreaterThan(0);
  });

  test("renders the per-property breakdown table for the current month", async () => {
    fetchMissedRevenue.mockResolvedValue(CONNECTED_DATA);

    render(<MissedRevenueDashboardPage />);

    await waitFor(() => expect(screen.getByText("prop-1")).toBeInTheDocument());
  });

  test("shows a connect-PriceLabs message when the host has no active connection", async () => {
    fetchMissedRevenue.mockResolvedValue({ ...EMPTY_MISSED_REVENUE, connected: false });

    render(<MissedRevenueDashboardPage />);

    await waitFor(() => expect(screen.getByText(/connect priceLabs/i)).toBeInTheDocument());
  });

  test("shows an error message when the fetch fails", async () => {
    fetchMissedRevenue.mockRejectedValue(new Error("Date range must not exceed 366 days"));

    render(<MissedRevenueDashboardPage />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Date range must not exceed 366 days"));
  });
});
