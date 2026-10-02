import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MonthlyComparison from "./MonthlyComparison.jsx";
import { HostKpiAllService } from "../services/HostKpiAllService";

jest.mock("../services/HostKpiAllService", () => ({
  HostKpiAllService: {
    fetchAll: jest.fn(),
  },
}));

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const KPI_ALL = {
  occupancyRate: 40,
  averageDailyRate: 120,
  revenuePerAvailableRoom: 48,
  averageLengthOfStay: 3.5,
};

describe("MonthlyComparison", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HostKpiAllService.fetchAll.mockResolvedValue({ occupancyRate: 10, averageDailyRate: 90, revenuePerAvailableRoom: 9, averageLengthOfStay: 2 });
  });

  test("reads the current metric value from the kpiAll prop, not its own fetch", async () => {
    render(<MonthlyComparison hostId="host-1" kpiAll={KPI_ALL} totalRevenue={5000} bookedNights={10} availableNights={20} />);

    expect(screen.getByText("40.0%")).toBeInTheDocument();

    // Every fetchAll call made should be for the 12-month trend (filterType "custom"),
    // never a redundant call for the current-month value the parent already has.
    await waitFor(() => expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12));
    HostKpiAllService.fetchAll.mock.calls.forEach(([, filterType]) => {
      expect(filterType).toBe("custom");
    });
  });

  test("fetches the 12-month trend once and reuses it across tab switches without refetching", async () => {
    render(<MonthlyComparison hostId="host-1" kpiAll={KPI_ALL} totalRevenue={5000} bookedNights={10} availableNights={20} />);

    await waitFor(() => expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12));

    fireEvent.click(screen.getByRole("button", { name: "ADR" }));
    fireEvent.click(screen.getByRole("button", { name: "RevPAR" }));
    fireEvent.click(screen.getByRole("button", { name: "ALOS" }));

    expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12);
  });

  test("does not refetch the trend when the kpiAll prop changes (a poll update)", async () => {
    const { rerender } = render(
      <MonthlyComparison hostId="host-1" kpiAll={KPI_ALL} totalRevenue={5000} bookedNights={10} availableNights={20} />
    );

    await waitFor(() => expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12));

    fireEvent.click(screen.getByRole("button", { name: "ADR" }));

    rerender(
      <MonthlyComparison
        hostId="host-1"
        kpiAll={{ ...KPI_ALL, averageDailyRate: 130 }}
        totalRevenue={5200}
        bookedNights={11}
        availableNights={20}
      />
    );

    expect(document.querySelector(".mc-stat-value")).toHaveTextContent("€130");
    expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12);
  });

  test("does not render a last-year line or legend entry", async () => {
    render(<MonthlyComparison hostId="host-1" kpiAll={KPI_ALL} totalRevenue={5000} bookedNights={10} availableNights={20} />);

    await waitFor(() => expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12));

    expect(screen.queryByText(/Last Year/i)).not.toBeInTheDocument();
  });

  test("shows 'No data available' for the current value when kpiAll is null", async () => {
    render(<MonthlyComparison hostId="host-1" kpiAll={null} totalRevenue={0} bookedNights={0} availableNights={0} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();

    await waitFor(() => expect(HostKpiAllService.fetchAll).toHaveBeenCalledTimes(12));
  });
});
