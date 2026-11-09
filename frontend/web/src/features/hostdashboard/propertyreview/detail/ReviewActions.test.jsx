import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PropertyReviewApiError,
  REVIEW_API_ERROR_CODE,
  approveListing,
  fetchReviewDetail,
} from "../services/propertyReviewApi";
import PropertyReviewDetailPage from "./PropertyReviewDetailPage";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), info: jest.fn() } }));
jest.mock("../services/propertyReviewApi", () => ({
  ...jest.requireActual("../services/propertyReviewApi"),
  fetchReviewDetail: jest.fn(),
  approveListing: jest.fn(),
}));

const makeDetail = (status = "PENDING_REVIEW", updatedAt = 1000) => ({
  property: { id: "p1", title: "Canal house", status, updatedAt },
  location: {},
  pricing: { roomRate: 100 },
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/detail/p1"]}>
      <Routes>
        <Route path="/detail/:propertyId" element={<PropertyReviewDetailPage />} />
        <Route path="/hostdashboard/admin/property-review" element={<p>Queue page</p>} />
      </Routes>
    </MemoryRouter>
  );

const openDialog = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
  return screen.findByRole("dialog");
};

const confirm = () => fireEvent.click(screen.getByRole("button", { name: "Confirm approval" }));

const apiError = (code) => new PropertyReviewApiError(0, code, "x");

describe("review actions on the detail page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchReviewDetail.mockResolvedValue(makeDetail());
  });

  test.each(["LIVE", "REJECTED", "DRAFT"])("shows no action bar for a %s listing", async (status) => {
    fetchReviewDetail.mockResolvedValue(makeDetail(status));

    renderPage();
    await screen.findByRole("heading", { name: "Canal house" });

    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  test("asks for confirmation, focuses Cancel and sends nothing until confirmed", async () => {
    renderPage();

    await openDialog();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(approveListing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("approves with the loaded updated-at, shows a toast and returns to the queue", async () => {
    approveListing.mockResolvedValue({ propertyId: "p1", status: "LIVE", updatedAt: 2000 });
    renderPage();
    await openDialog();

    confirm();

    expect(await screen.findByText("Queue page")).toBeTruthy();
    expect(approveListing).toHaveBeenCalledWith("p1", 1000);
    expect(toast.success).toHaveBeenCalledWith("Listing approved.");
  });

  test("sends one request for a double click and locks the dialog while it runs", async () => {
    approveListing.mockReturnValue(new Promise(() => {}));
    renderPage();
    await openDialog();

    const confirmButton = screen.getByRole("button", { name: "Confirm approval" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(approveListing).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Approving…" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Cancel" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Close" }).disabled).toBe(true);
  });

  test("on a stale review closes the dialog, reloads without a loading state and shows the banner", async () => {
    approveListing.mockRejectedValueOnce(apiError(REVIEW_API_ERROR_CODE.STALE_REVIEW));
    renderPage();
    await openDialog();
    let finishReload;
    fetchReviewDetail.mockReturnValueOnce(new Promise((resolve) => (finishReload = resolve)));

    confirm();

    expect(await screen.findByText("This listing changed since you opened it. Please review it again.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText("Loading the listing…")).toBeNull();
    expect(screen.getByRole("heading", { name: "Canal house" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve" }).disabled).toBe(true);

    finishReload(makeDetail("PENDING_REVIEW", 3000));
    await waitFor(() => expect(screen.getByRole("button", { name: "Approve" }).disabled).toBe(false));
    approveListing.mockResolvedValue({});
    await openDialog();
    confirm();

    await waitFor(() => expect(approveListing).toHaveBeenLastCalledWith("p1", 3000));
  });

  test("on a wrong status shows an info toast and reloads, which removes the action bar", async () => {
    approveListing.mockRejectedValue(apiError(REVIEW_API_ERROR_CODE.WRONG_STATUS));
    renderPage();
    await openDialog();
    fetchReviewDetail.mockResolvedValueOnce(makeDetail("LIVE", 2000));

    confirm();

    await waitFor(() => expect(screen.queryByRole("button", { name: "Approve" })).toBeNull());
    expect(toast.info).toHaveBeenCalledWith("This listing was already reviewed.");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fetchReviewDetail).toHaveBeenCalledTimes(2);
  });

  test.each([
    [REVIEW_API_ERROR_CODE.UNAUTHENTICATED, "Your session has expired. Please sign in again."],
    [REVIEW_API_ERROR_CODE.FORBIDDEN, "Not authorized"],
    [REVIEW_API_ERROR_CODE.UNAVAILABLE, "Could not save. Try again."],
    [REVIEW_API_ERROR_CODE.SERVER, "Could not save. Try again."],
  ])("keeps the dialog open with the right message for %s", async (code, message) => {
    approveListing.mockRejectedValue(apiError(code));
    renderPage();
    await openDialog();

    confirm();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm approval" }).disabled).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
