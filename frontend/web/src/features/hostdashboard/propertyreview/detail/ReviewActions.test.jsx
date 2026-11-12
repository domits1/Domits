import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { toast } from "react-toastify";
import {
  PropertyReviewApiError,
  REVIEW_API_ERROR_CODE,
  approveListing,
  fetchReviewDetail,
  rejectListing,
} from "../services/propertyReviewApi";
import PropertyReviewDetailPage from "./PropertyReviewDetailPage";

jest.mock("react-toastify", () => ({ toast: { success: jest.fn(), info: jest.fn() } }));
jest.mock("../services/propertyReviewApi", () => ({
  ...jest.requireActual("../services/propertyReviewApi"),
  fetchReviewDetail: jest.fn(),
  approveListing: jest.fn(),
  rejectListing: jest.fn(),
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
    expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
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

describe("rejecting a listing on the detail page", () => {
  const reasonBox = () => screen.getByRole("textbox", { name: "Reason" });
  const typeReason = (value) => fireEvent.change(reasonBox(), { target: { value } });
  const submitReject = () => fireEvent.click(screen.getByRole("button", { name: "Reject listing" }));
  const openReject = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "Reject" }));
    return screen.findByRole("dialog");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetchReviewDetail.mockResolvedValue(makeDetail());
  });

  test("opens with the reason focused, Submit disabled and nothing sent", async () => {
    renderPage();

    await openReject();

    expect(reasonBox()).toHaveFocus();
    expect(screen.getByText("0 / 500")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject listing" }).disabled).toBe(true);
    expect(rejectListing).not.toHaveBeenCalled();
  });

  test.each([
    ["an empty reason", "", "0 / 500", true],
    ["a blank reason", "   ", "0 / 500", true],
    ["a padded reason", "  ok  ", "2 / 500", false],
    ["the longest reason", "a".repeat(500), "500 / 500", false],
    ["a reason one too long", "a".repeat(501), "501 / 500", true],
  ])("handles %s", async (label, value, counter, disabled) => {
    renderPage();
    await openReject();

    typeReason(value);

    expect(screen.getByText(counter)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reject listing" }).disabled).toBe(disabled);
  });

  test("rejects with the loaded updated-at and the trimmed reason, shows a toast and returns to the queue", async () => {
    rejectListing.mockResolvedValue({ propertyId: "p1", status: "REJECTED", updatedAt: 2000 });
    renderPage();
    await openReject();
    typeReason("  Photos are missing  ");

    submitReject();

    expect(await screen.findByText("Queue page")).toBeTruthy();
    expect(rejectListing).toHaveBeenCalledWith("p1", 1000, "Photos are missing");
    expect(toast.success).toHaveBeenCalledWith("Listing rejected.");
  });

  test("sends one request for a double click and locks the dialog while it runs", async () => {
    rejectListing.mockReturnValue(new Promise(() => {}));
    renderPage();
    await openReject();
    typeReason("Photos are missing");

    const submitButton = screen.getByRole("button", { name: "Reject listing" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(rejectListing).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(reasonBox().disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Rejecting…" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Cancel" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Close" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Close backdrop" }).disabled).toBe(true);
  });

  test("keeps the reason when the dialog is cancelled and reopened", async () => {
    renderPage();
    await openReject();
    typeReason("Photos are missing");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await openReject();

    expect(reasonBox().value).toBe("Photos are missing");
  });

  test("on a stale review keeps the reason and reviews the reloaded listing", async () => {
    rejectListing.mockRejectedValueOnce(apiError(REVIEW_API_ERROR_CODE.STALE_REVIEW));
    renderPage();
    await openReject();
    typeReason("Photos are missing");
    let finishReload;
    fetchReviewDetail.mockReturnValueOnce(new Promise((resolve) => (finishReload = resolve)));

    submitReject();

    expect(await screen.findByText("This listing changed since you opened it. Please review it again.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Reject" }).disabled).toBe(true);
    finishReload(makeDetail("PENDING_REVIEW", 3000));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reject" }).disabled).toBe(false));
    rejectListing.mockResolvedValue({});
    await openReject();
    expect(reasonBox().value).toBe("Photos are missing");
    submitReject();

    await waitFor(() => expect(rejectListing).toHaveBeenLastCalledWith("p1", 3000, "Photos are missing"));
  });

  test("on a wrong status shows an info toast, reloads and clears the reason", async () => {
    rejectListing.mockRejectedValue(apiError(REVIEW_API_ERROR_CODE.WRONG_STATUS));
    renderPage();
    await openReject();
    typeReason("Photos are missing");

    submitReject();

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith("This listing was already reviewed."));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(fetchReviewDetail).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reject" }).disabled).toBe(false));
    await openReject();
    expect(reasonBox().value).toBe("");
  });

  test("shows the server message for a bad request and keeps the dialog and the reason", async () => {
    rejectListing.mockRejectedValue(
      new PropertyReviewApiError(400, REVIEW_API_ERROR_CODE.BAD_REQUEST, "Reason is too long")
    );
    renderPage();
    await openReject();
    typeReason("Photos are missing");

    submitReject();

    expect(await screen.findByText("Reason is too long")).toBeTruthy();
    expect(reasonBox().value).toBe("Photos are missing");
    expect(screen.getByRole("button", { name: "Reject listing" }).disabled).toBe(false);
    expect(toast.success).not.toHaveBeenCalled();
  });

  test.each([
    [REVIEW_API_ERROR_CODE.UNAUTHENTICATED, "Your session has expired. Please sign in again."],
    [REVIEW_API_ERROR_CODE.FORBIDDEN, "Not authorized"],
    [REVIEW_API_ERROR_CODE.UNAVAILABLE, "Could not save. Try again."],
    [REVIEW_API_ERROR_CODE.SERVER, "Could not save. Try again."],
  ])("keeps the dialog open with the right message for %s", async (code, message) => {
    rejectListing.mockRejectedValue(apiError(code));
    renderPage();
    await openReject();
    typeReason("Photos are missing");

    submitReject();

    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(reasonBox().value).toBe("Photos are missing");
  });
});
