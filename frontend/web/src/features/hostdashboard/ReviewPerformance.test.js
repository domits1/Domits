import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ReviewPerformance from "./ReviewPerformance";
import { fetchHostPropertySelectOptions } from "./services/hostTaskPropertyService";
import { getPropertyReviewPerformance } from "../review/services/reviewAPI";
jest.mock("./services/hostTaskPropertyService", () => ({ fetchHostPropertySelectOptions: jest.fn() }));
jest.mock("../review/services/reviewAPI", () => ({ getPropertyReviewPerformance: jest.fn() }));
jest.mock("recharts", () => {
  const React = require("react");
  const Container = ({ children }) => <div>{children}</div>;
  return { ResponsiveContainer: Container, LineChart: Container, Line: () => null,
    XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null };
});
const points = [{ period: "2026-01-01", average_score: 4.5, review_count: 2 },
  { period: "2026-02-01", average_score: null, review_count: 0 }];
const selectProperty = async (value = "p1") => {
  await screen.findByRole("option", { name: "Beach house" });
  await act(async () => { fireEvent.change(screen.getByLabelText("Property"), { target: { value } }); });
};
beforeEach(() => {
  jest.clearAllMocks();
  fetchHostPropertySelectOptions.mockResolvedValue([{ value: "p1", label: "Beach house" }, { value: "p2", label: "City flat" }]);
  getPropertyReviewPerformance.mockResolvedValue({ periods: points });
});
test("loads owned properties and displays scores and counts after selection", async () => {
  render(<ReviewPerformance userId="host" />);
  await selectProperty();
  expect(fetchHostPropertySelectOptions).toHaveBeenCalledWith("host");
  expect(await screen.findByText("4.50")).toBeInTheDocument();
  expect(screen.getByText("No score")).toBeInTheDocument();
  expect(screen.getByRole("table")).toHaveTextContent("2");
  expect(getPropertyReviewPerformance).toHaveBeenCalledWith(expect.objectContaining({ propertyId: "p1", interval: "month" }));
});
test.each(["week", "year"])("requests %s with the selected date range", async (interval) => {
  render(<ReviewPerformance userId="host" />);
  await selectProperty();
  await act(async () => {
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2025-01-01" } });
  fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-03-01" } });
  fireEvent.change(screen.getByLabelText("Interval"), { target: { value: interval } });
  });
  await waitFor(() => expect(getPropertyReviewPerformance).toHaveBeenLastCalledWith({ propertyId: "p1",
    startDate: "2025-01-01", endDate: "2026-03-01", interval }));
});
test("rejects reversed dates without fetching or retaining the old chart", async () => {
  render(<ReviewPerformance userId="host" />);
  await selectProperty();
  await screen.findByText("4.50");
  getPropertyReviewPerformance.mockClear();
  fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2099-01-01" } });
  expect(screen.getByRole("alert")).toHaveTextContent("start date");
  expect(getPropertyReviewPerformance).not.toHaveBeenCalled();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
test("displays an empty range and preserves missing scores", async () => {
  getPropertyReviewPerformance.mockResolvedValue({ periods: [points[1]] });
  render(<ReviewPerformance userId="host" />);
  await selectProperty();
  expect(await screen.findByText("No eligible reviews in this date range.")).toBeInTheDocument();
  expect(screen.getByText("No score")).toBeInTheDocument();
});
test("shows authorization failures and retries the selected property", async () => {
  getPropertyReviewPerformance.mockRejectedValueOnce(new Error("Property not found or access is denied."));
  render(<ReviewPerformance userId="host" />);
  await selectProperty();
  expect(await screen.findByRole("alert")).toHaveTextContent("access is denied");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("4.50")).toBeInTheDocument();
});
test("ignores a delayed response for a previously selected property", async () => {
  let resolveFirst;
  getPropertyReviewPerformance.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
  render(<ReviewPerformance userId="host" />);
  await selectProperty();
  await selectProperty("p2");
  await screen.findByText("4.50");
  await act(async () => { resolveFirst({ periods: [{ period: "1999-01-01", average_score: 1, review_count: 1 }] }); });
  await waitFor(() => expect(screen.queryByText("1999-01-01")).not.toBeInTheDocument());
});
test("offers retry when properties fail to load", async () => {
  fetchHostPropertySelectOptions.mockRejectedValueOnce(new Error("offline"));
  render(<ReviewPerformance userId="host" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your properties");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("option", { name: "Beach house" })).toBeInTheDocument();
});
test("handles a host with no properties", async () => {
  fetchHostPropertySelectOptions.mockResolvedValue([]);
  render(<ReviewPerformance userId="host" />);
  expect(await screen.findByText("No properties available.")).toBeInTheDocument();
  expect(getPropertyReviewPerformance).not.toHaveBeenCalled();
});
