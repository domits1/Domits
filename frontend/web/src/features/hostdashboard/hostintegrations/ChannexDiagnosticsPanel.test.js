const React = require("react");
const { fireEvent, render, screen, waitFor } = require("@testing-library/react");

jest.mock("./channexApi", () => ({
  getChannexAriPayloadPreview: jest.fn(),
  getChannexAriPreview: jest.fn(),
  getChannexAriTargets: jest.fn(),
  getChannexStatus: jest.fn(),
  getLatestChannexSyncEvidence: jest.fn(),
  receiveChannexBookingRevisions: jest.fn(),
  syncChannexAri: jest.fn(),
  syncChannexAvailability: jest.fn(),
  syncChannexCertificationTestCase: jest.fn(),
  syncChannexFull: jest.fn(),
  syncChannexRestrictions: jest.fn(),
}));

const ChannexDiagnosticsPanel = require("./ChannexDiagnosticsPanel").default;
const {
  getChannexStatus,
  syncChannexCertificationTestCase,
  syncChannexFull,
  syncChannexRestrictions,
} = require("./channexApi");

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

describe("ChannexDiagnosticsPanel certification actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(globalThis, "confirm").mockReturnValue(true);
    getChannexStatus.mockResolvedValue({ status: "CONNECTED" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("runs restrictions/rates sync as one selected-range backend action", async () => {
    syncChannexRestrictions.mockResolvedValue({
      restrictionsSyncMode: "single-request-v1",
      requestCount: 1,
      taskIds: ["task-restrictions-1"],
      results: [{ taskId: "task-restrictions-1" }],
    });

    render(React.createElement(ChannexDiagnosticsPanel, { userId: "user-1" }));
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    await waitFor(() => expect(syncChannexRestrictions).toHaveBeenCalledTimes(1));
    expect(syncChannexRestrictions.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        userId: "user-1",
        domitsPropertyId: "domits-property-1",
        dateFrom: "2026-05-24",
        dateTo: "2027-10-05",
      })
    );
    expect(await screen.findByText("Sync restrictions/rates completed.")).toBeTruthy();
    expect(screen.getAllByText(/task-restrictions-1/).length).toBeGreaterThan(0);
  });

  test("shows backend error details for failed restrictions sync", async () => {
    const error = new Error("POST /integrations/channex/sync/restrictions failed with status 500: provider timeout");
    error.status = 500;
    error.endpoint = "/integrations/channex/sync/restrictions";
    error.method = "POST";
    error.responseBody = {
      error: "Failed to sync Channex restrictions.",
    };
    syncChannexRestrictions.mockRejectedValueOnce(error);

    render(React.createElement(ChannexDiagnosticsPanel, { userId: "user-1" }));
    fillRequiredInputs({ dateTo: "2026-07-23" });

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    await waitFor(() => expect(syncChannexRestrictions).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/POST \/integrations\/channex\/sync\/restrictions failed/)).toBeTruthy();
    expect(screen.getByText("HTTP status")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
  });

  test("blocks restrictions sync ranges over 500 days before sending", async () => {
    render(React.createElement(ChannexDiagnosticsPanel, { userId: "user-1" }));
    fillRequiredInputs({ dateTo: "2027-10-06" });

    fireEvent.click(screen.getByRole("button", { name: "Sync restrictions/rates" }));

    expect(syncChannexRestrictions).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "The selected range is 501 days. Channex certification syncs support up to 500 inclusive days."
      )
    ).toBeTruthy();
  });

  test("runs a change-only certification test case action", async () => {
    syncChannexCertificationTestCase.mockResolvedValue({
      testCaseId: "2",
      testCaseName: "Single Date Update for Single Rate",
      syncMode: "changeUpdate",
      requestCount: 1,
      taskIds: ["task-case-2"],
      results: [{ taskId: "task-case-2" }],
    });

    render(React.createElement(ChannexDiagnosticsPanel, { userId: "user-1" }));
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Run #2" }));

    await waitFor(() => expect(syncChannexCertificationTestCase).toHaveBeenCalledTimes(1));
    expect(syncChannexCertificationTestCase).toHaveBeenCalledWith({
      userId: "user-1",
      domitsPropertyId: "domits-property-1",
      testCaseId: "2",
    });
    expect(await screen.findByText("Certification test #2 completed.")).toBeTruthy();
    expect(screen.getAllByText(/task-case-2/).length).toBeGreaterThan(0);
  });

  test("runs full/certification sync from the admin actions UI", async () => {
    syncChannexFull.mockResolvedValue({
      requestCount: 2,
      overallSuccess: true,
      taskIds: ["task-availability-full", "task-restrictions-full"],
      warnings: [],
      errors: [],
    });

    render(React.createElement(ChannexDiagnosticsPanel, { userId: "user-1" }));
    fillRequiredInputs();

    fireEvent.click(screen.getByRole("button", { name: "Full/certification sync" }));

    await waitFor(() => expect(syncChannexFull).toHaveBeenCalledTimes(1));
    expect(syncChannexFull).toHaveBeenCalledWith({
      userId: "user-1",
      domitsPropertyId: "domits-property-1",
      dateFrom: "2026-05-24",
      dateTo: "2027-10-05",
    });
    expect(await screen.findByText("Full/certification sync completed.")).toBeTruthy();
    expect(screen.getAllByText(/task-availability-full/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/task-restrictions-full/).length).toBeGreaterThan(0);
  });
});
