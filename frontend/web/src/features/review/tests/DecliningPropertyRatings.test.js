import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import DecliningPropertyRatings from "../views/DecliningPropertyRatings";
import { getPropertyRatingTrends } from "../services/reviewAPI";
import { fetchHostPropertySelectOptions } from "../../../services/hostPropertyService";
jest.mock("../services/reviewAPI", () => ({ getPropertyRatingTrends: jest.fn() }));
jest.mock("../../../services/hostPropertyService", () => ({ fetchHostPropertySelectOptions: jest.fn() }));
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
  expect(screen.getByRole("table")).toHaveTextContent("4.004.50-0.504");
  expect(screen.queryByText("p2")).not.toBeInTheDocument();
  expect(screen.getByText(/decrease of at least 0.5/)).toBeInTheDocument();
  expect(screen.getByText(/2026-08-08 to 2026-09-06/)).toBeInTheDocument();
});
test("always filters to declining properties and hides the removed checkbox", async () => {
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.queryByText("p2")).not.toBeInTheDocument();
  expect(getPropertyRatingTrends).toHaveBeenCalledWith(expect.objectContaining({ status: "DECLINING" }));
});
test("requests chosen periods and resets pagination when filters change", async () => {
  getPropertyRatingTrends.mockImplementation(({ offset }) => Promise.resolve({ ...result, next_offset: offset === "0" ? 7 : null }));
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Next page" })); });
  expect(getPropertyRatingTrends).toHaveBeenLastCalledWith(expect.objectContaining({ offset: "7" }));
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Comparison end date"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Days per period"), { target: { value: "14" } });
  });
  await waitFor(() => expect(getPropertyRatingTrends).toHaveBeenLastCalledWith({ endDate: "2026-01-01", days: "14", offset: "0", status: "DECLINING" }));
});
test.each(["0", "367", ""])("rejects invalid days %s without fetching", async (value) => {
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  getPropertyRatingTrends.mockClear();
  fireEvent.change(screen.getByLabelText("Days per period"), { target: { value } });
  expect(screen.getByRole("alert")).toHaveTextContent("1 and 366");
  expect(getPropertyRatingTrends).not.toHaveBeenCalled();
  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.queryByText("Beach house")).not.toBeInTheDocument();
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
  expect(await screen.findByText("No declining properties in this period.")).toBeInTheDocument();
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

test.each([
  { previous_period: undefined }, { current_period: null },
  { previous_period: {} }, { current_period: { start_date: "2026-01-01" } },
  { decline_threshold: {} }, { minimum_reviews_per_period: null },
  { properties: [{ ...property("p1", "DECLINING"), current_average_rating: "4" }] },
])("shows a recoverable error for malformed response %j", async (malformed) => {
  getPropertyRatingTrends.mockResolvedValueOnce({ ...result, ...malformed });
  render(<DecliningPropertyRatings userId="host" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load rating trends");
  expect(screen.getByRole("table")).toHaveTextContent("Property comparisons are currently unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Beach house")).toBeInTheDocument();
});

test("uses server offsets for next, previous and page number", async () => {
  getPropertyRatingTrends.mockImplementation(({ offset }) => Promise.resolve({ ...result,
    next_offset: offset === "0" ? 7 : null }));
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await screen.findByText("Page 2");
  expect(getPropertyRatingTrends).toHaveBeenLastCalledWith(expect.objectContaining({ offset: "7" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  await screen.findByText("Page 1");
  expect(getPropertyRatingTrends).toHaveBeenLastCalledWith(expect.objectContaining({ offset: "0" }));
});

test("debounces days edits into a single request", async () => {
  render(<DecliningPropertyRatings userId="host" />);
  await screen.findByText("Beach house");
  jest.useFakeTimers({ shouldClearNativeTimers: true });
  try {
    getPropertyRatingTrends.mockClear();
    fireEvent.change(screen.getByLabelText("Days per period"), { target: { value: "1" } });
    act(() => { jest.advanceTimersByTime(200); });
    fireEvent.change(screen.getByLabelText("Days per period"), { target: { value: "14" } });
    act(() => { jest.advanceTimersByTime(299); });
    expect(getPropertyRatingTrends).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(1); });
    expect(getPropertyRatingTrends).toHaveBeenCalledTimes(1);
    expect(getPropertyRatingTrends).toHaveBeenCalledWith(expect.objectContaining({ days: "14" }));
  } finally {
    jest.useRealTimers();
  }
});
