import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DecliningPropertyRatings from "../DecliningPropertyRatings";
import { getPropertyRatingTrends } from "../services/reviewAPI";
import { fetchHostPropertySelectOptions } from "../../hostdashboard/services/hostTaskPropertyService";
jest.mock("../services/reviewAPI", () => ({ getPropertyRatingTrends: jest.fn() }));
jest.mock("../../hostdashboard/services/hostTaskPropertyService", () => ({ fetchHostPropertySelectOptions: jest.fn() }));
const property = (id, status) => ({ property_id: id, trend_status: status, previous_average_rating: 4.5,
  current_average_rating: 4, rating_change: -0.5, previous_review_count: 3, current_review_count: 4 });
const result = { properties: [property("p1", "DECLINING"), property("p2", "STABLE")],
  previous_period: { start_date: "2026-08-08", end_date: "2026-09-06" },
  current_period: { start_date: "2026-09-07", end_date: "2026-10-06" },
  decline_threshold: 0.5, minimum_reviews_per_period: 3, next_offset: null };
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-07T12:00:00Z"));
  getPropertyRatingTrends.mockResolvedValue(result);
  fetchHostPropertySelectOptions.mockResolvedValue([{ value: "p1", label: "Beach house" }]);
});
afterEach(() => { jest.restoreAllMocks(); });
test("shows declining property names, averages, change, counts, periods and server policy", async () => {
  render(<DecliningPropertyRatings userId="host" />);
  expect(await screen.findByText("Beach house")).toBeInTheDocument();
  expect(screen.getByRole("table")).toHaveTextContent("4.504.00-0.5034Declining");
  expect(screen.queryByText("p2")).not.toBeInTheDocument();
  expect(screen.getByText(/decrease of at least 0.5/)).toBeInTheDocument();
  expect(screen.getByText(/2026-08-08 to 2026-09-06/)).toBeInTheDocument();
});
test("shows all backend statuses without calculating trends in the browser", async () => {
  getPropertyRatingTrends.mockResolvedValue({ ...result, properties: [property("p1", "DECLINING"),
    property("p2", "STABLE"), { ...property("p3", "IMPROVING"), rating_change: 0.5 },
    { ...property("p4", "INSUFFICIENT_DATA"), current_average_rating: null, rating_change: null, current_review_count: 0 }] });
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  fireEvent.click(screen.getByRole("checkbox"));
  for (const label of ["Declining", "Stable", "Improving", "Insufficient data", "No score", "Not enough reviews", "+0.50"]) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
});
test("requests chosen periods and resets pagination when filters change", async () => {
  getPropertyRatingTrends.mockResolvedValue({ ...result, next_offset: 25 });
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next page" })); });
  expect(getPropertyRatingTrends).toHaveBeenLastCalledWith(expect.objectContaining({ offset: "25" }));
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Comparison end date"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Days per period"), { target: { value: "14" } });
  });
  expect(getPropertyRatingTrends).toHaveBeenLastCalledWith({ endDate: "2026-01-01", days: "14", offset: "0" });
});
test.each(["0", "367", ""])("rejects invalid days %s without fetching", async (value) => {
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  getPropertyRatingTrends.mockClear();
  fireEvent.change(screen.getByLabelText("Days per period"), { target: { value } });
  expect(screen.getByRole("alert")).toHaveTextContent("1 and 366");
  expect(getPropertyRatingTrends).not.toHaveBeenCalled();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
test("shows errors and retries", async () => {
  getPropertyRatingTrends.mockRejectedValueOnce(new Error("Access denied"));
  render(<DecliningPropertyRatings userId="host" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Beach house")).toBeInTheDocument();
});
test("rejects today's incomplete period without requesting data", async () => {
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  getPropertyRatingTrends.mockClear();
  fireEvent.change(screen.getByLabelText("Comparison end date"), { target: { value: "2026-10-07" } });
  expect(screen.getByRole("alert")).toHaveTextContent("before today");
  expect(getPropertyRatingTrends).not.toHaveBeenCalled();
});
test("distinguishes an empty property page from a page with no declines", async () => {
  getPropertyRatingTrends.mockResolvedValueOnce({ ...result, properties: [] });
  const { unmount } = render(<DecliningPropertyRatings userId="host" />);
  expect(await screen.findByText("No properties available on this page.")).toBeInTheDocument();
  unmount();
  getPropertyRatingTrends.mockResolvedValueOnce({ ...result, properties: [property("p2", "STABLE")], next_offset: 25 });
  render(<DecliningPropertyRatings userId="host" />);
  expect(await screen.findByText(/No declining properties on this page/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
});
test("ignores stale responses after changing the period", async () => {
  let resolveFirst;
  getPropertyRatingTrends.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
  render(<DecliningPropertyRatings userId="host" />);
  await act(async () => { fireEvent.change(screen.getByLabelText("Days per period"), { target: { value: "14" } }); });
  await screen.findByText("Beach house");
  await act(async () => { resolveFirst({ ...result, properties: [property("stale", "DECLINING")] }); });
  await waitFor(() => expect(screen.queryByText("stale")).not.toBeInTheDocument());
});
