import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChannexDiagnosticsPanel from "./ChannexDiagnosticsPanel";
import {
  getChannexStatus,
  syncChannexRestrictions,
} from "./channexApi";

jest.mock("./channexApi", () => ({
  getChannexAriPayloadPreview: jest.fn(),
  getChannexAriPreview: jest.fn(),
  getChannexAriTargets: jest.fn(),
  getChannexStatus: jest.fn(),
  getLatestChannexSyncEvidence: jest.fn(),
  receiveChannexBookingRevisions: jest.fn(),
  syncChannexAri: jest.fn(),
  syncChannexAvailability: jest.fn(),
  syncChannexFull: jest.fn(),
  syncChannexRestrictions: jest.fn(),
}));

const fillRequiredInputs = ({ dateTo = "2027-10-05" } = {}) => {
  fireEvent.change(screen.getByLabelText("Domits property ID"), {
    target: { value: "domits-property-1" },
  });
  fireEvent.change(screen.getByLabelText("Date from"), {
    target: { value: "2026-05-24" },
  });
  fireEvent.change(screen.getByLabelText("Date to"), {
    target: { value: dateTo },
  });
  fireEvent.click(screen.getByRole("button", { name: "Actions" }));
};

describe("ChannexDiagnosticsPanel restrictions sync pagination", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(globalThis, "confirm").mockReturnValue(true);
    getChannexStatus.mockResolvedValue({ status: "CONNECTED" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("splits a 500-day restrictions sync into backend page calls", async () => {
    syncChannexRestrictions.mockImplementation(({ pageNumber }) =>
      Promise.resolve({
        restrictionsSyncMode: "frontend-paginated-v1",
        evidenceId: `evidence-${pageNumber}`,
        requestCount: 1,
        results: [{ taskId: `task-${pageNumber}` }],
      })
    );

    render(<ChannexDiagnosticsPanel userId="user-1" />);
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    await waitFor(() => expect(syncChannexRestrictions).toHaveBeenCalledTimes(17));
    expect(syncChannexRestrictions.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        userId: "user-1",
        domitsPropertyId: "domits-property-1",
        dateFrom: "2026-05-24",
        dateTo: "2026-06-22",
        requestedDateFrom: "2026-05-24",
        requestedDateTo: "2027-10-05",
        pageNumber: 1,
        totalPages: 17,
        pageSizeDays: 30,
      })
    );
    expect(syncChannexRestrictions.mock.calls[16][0]).toEqual(
      expect.objectContaining({
        dateFrom: "2027-09-16",
        dateTo: "2027-10-05",
        pageNumber: 17,
        totalPages: 17,
      })
    );
    expect(await screen.findByText("Sync restrictions/rates completed for the selected range.")).toBeTruthy();
    expect(screen.getByText("Step 17 of 17")).toBeTruthy();
    expect(screen.getAllByText(/task-17/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/evidence-17/).length).toBeGreaterThan(0);
  });

  test("stops on the first failed restrictions sync page", async () => {
    const error = new Error("POST /integrations/channex/sync/restrictions failed with status 500: provider timeout");
    error.status = 500;
    error.endpoint = "/integrations/channex/sync/restrictions";
    error.method = "POST";
    error.responseBody = {
      error: "Failed to sync Channex restrictions.",
      pageNumber: 2,
    };
    syncChannexRestrictions
      .mockResolvedValueOnce({
        restrictionsSyncMode: "frontend-paginated-v1",
        evidenceId: "evidence-1",
        requestCount: 1,
        results: [{ taskId: "task-1" }],
      })
      .mockRejectedValueOnce(error);

    render(<ChannexDiagnosticsPanel userId="user-1" />);
    fillRequiredInputs({ dateTo: "2026-07-23" });

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    await waitFor(() => expect(syncChannexRestrictions).toHaveBeenCalledTimes(2));
    expect(syncChannexRestrictions).not.toHaveBeenCalledTimes(3);
    expect(await screen.findByText("Restrictions/rates sync failed for 2026-06-23 -> 2026-07-22.")).toBeTruthy();
    expect(screen.getByText("HTTP status")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
  });

  test("blocks restrictions sync ranges over 500 days before sending", async () => {
    render(<ChannexDiagnosticsPanel userId="user-1" />);
    fillRequiredInputs({ dateTo: "2027-10-06" });

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    expect(syncChannexRestrictions).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "The selected range is 501 days. Channex certification syncs support up to 500 inclusive days."
      )
    ).toBeTruthy();
  });
});
