import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HostChannelDistribution from "./HostChannelDistribution";
import {
  connectChannex,
  disconnectChannex,
  getChannexStatus,
  getLatestSyncEvidence,
  getMappedProperties,
  getPropertyMappingRows,
} from "../services/channexDistributionService";

// Mutable so a test can model useFetchUser resolving the id after the first render.
let mockUserId = "user-1";
jest.mock("../../../../hooks/useFetchUser", () => ({ __esModule: true, default: () => mockUserId }));
jest.mock("../services/channexDistributionService");

const LISTINGS = [
  { property: { id: "property-1", title: "Canal house" } },
  { property: { id: "property-2", title: "Beach apartment" } },
];

// The view reads these flags from the service module at render time, so tests flip them on the
// mocked module. Both default to off, as in production.
const service = jest.requireMock("../services/channexDistributionService");

describe("HostChannelDistribution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUserId = "user-1";
    service.MOCK_PREVIEW_SECTIONS_ENABLED = false;
    jest.spyOn(console, "error").mockImplementation(() => {});
    getMappedProperties.mockResolvedValue(LISTINGS);
    getLatestSyncEvidence.mockResolvedValue({ item: null });
    getPropertyMappingRows.mockResolvedValue([]);
  });

  afterEach(() => {
    service.MOCK_PREVIEW_SECTIONS_ENABLED = false;
  });

  test("treats a 403 as the normal not-connected state, not as an error", async () => {
    getChannexStatus.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    render(<HostChannelDistribution />);

    expect(await screen.findByText("No channel connected yet")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
    expect(console.error).not.toHaveBeenCalled();
  });

  test("shows the error with a Retry button on a 500, and Retry fetches again", async () => {
    getChannexStatus.mockRejectedValueOnce(Object.assign(new Error("server exploded"), { status: 500 }));
    getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });

    render(<HostChannelDistribution />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong loading your Channex connection.");
    expect(alert).not.toHaveTextContent("server exploded");
    expect(console.error).toHaveBeenCalledWith(expect.any(String), "server exploded");
    expect(screen.queryByText("No channel connected yet")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(getChannexStatus).toHaveBeenCalledTimes(2);
  });

  test("shows the same error block on a 401", async () => {
    getChannexStatus.mockRejectedValue(Object.assign(new Error("unauthorized"), { status: 401 }));

    render(<HostChannelDistribution />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong loading your Channex connection.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  describe("Property picker", () => {
    const NO_PROPERTIES_SENTENCE = "No properties are linked to Channex yet.";
    const LOAD_ERROR_SENTENCE = "We couldn't load your properties.";

    test("shows the picker on real data with the first property selected", async () => {
      getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });

      render(<HostChannelDistribution />);

      const picker = await screen.findByRole("combobox");
      expect(picker).toHaveValue("property-1");
      expect(within(picker).getByRole("option", { name: "Beach apartment" })).toBeInTheDocument();

      fireEvent.change(picker, { target: { value: "property-2" } });

      expect(picker).toHaveValue("property-2");
    });

    test("shows a loading sentence while the properties load", async () => {
      getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });
      getMappedProperties.mockReturnValue(new Promise(() => {}));

      render(<HostChannelDistribution />);

      expect(await screen.findByText("Loading your properties…")).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    test("shows a sentence and no picker when no property is linked", async () => {
      getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });
      getMappedProperties.mockResolvedValue([]);

      render(<HostChannelDistribution />);

      expect(await screen.findByText(NO_PROPERTIES_SENTENCE)).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    test("selects a single property silently, with no picker and no sentence", async () => {
      getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });
      getMappedProperties.mockResolvedValue([LISTINGS[0]]);

      render(<HostChannelDistribution />);

      await waitFor(() => expect(getMappedProperties).toHaveBeenCalledTimes(1));
      await screen.findByText("Channex");
      await waitFor(() => expect(screen.queryByText("Loading your properties…")).not.toBeInTheDocument());
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByText(NO_PROPERTIES_SENTENCE)).not.toBeInTheDocument();
      expect(screen.queryByText(LOAD_ERROR_SENTENCE)).not.toBeInTheDocument();
    });

    test.each(["CHANNEX_NOT_CONNECTED", "CHANNEX_RECONNECT_REQUIRED"])(
      "shows no picker and no sentence on a 409 (%s), because the status card already explains it",
      async (errorCode) => {
        getChannexStatus.mockResolvedValue({ status: "RECONNECT_REQUIRED", displayName: "Channex" });
        getMappedProperties.mockRejectedValue(
          Object.assign(new Error("conflict"), { status: 409, responseBody: { errorCode } })
        );

        render(<HostChannelDistribution />);

        await screen.findByText("Channex");
        await waitFor(() => expect(getMappedProperties).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.queryByText("Loading your properties…")).not.toBeInTheDocument());
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
        expect(screen.queryByText(NO_PROPERTIES_SENTENCE)).not.toBeInTheDocument();
        expect(screen.queryByText(LOAD_ERROR_SENTENCE)).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      }
    );

    test("shows the error sentence when the properties fail to load", async () => {
      getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });
      getMappedProperties.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));

      render(<HostChannelDistribution />);

      expect(await screen.findByText(LOAD_ERROR_SENTENCE)).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    test.each([
      {
        label: "not connected",
        status: () => Promise.resolve({ status: "NOT_CONNECTED" }),
        settled: "No channel connected yet",
      },
      {
        label: "outside the allowlist",
        status: () => Promise.reject(Object.assign(new Error("forbidden"), { status: 403 })),
        settled: "No channel connected yet",
      },
    ])("makes no property request when the host is $label", async ({ status, settled }) => {
      getChannexStatus.mockImplementation(status);

      render(<HostChannelDistribution />);

      await screen.findByText(settled);
      expect(getMappedProperties).not.toHaveBeenCalled();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });
  });

  test("requests the status once and does not refetch when the user id resolves after the first render", async () => {
    mockUserId = null;
    getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });

    const { rerender } = render(<HostChannelDistribution />);
    await screen.findByText("Channex");

    mockUserId = "user-1";
    rerender(<HostChannelDistribution />);
    await screen.findByText("Channex");

    expect(getChannexStatus).toHaveBeenCalledTimes(1);
    expect(getChannexStatus).toHaveBeenCalledWith();
  });

  describe("Last sync card", () => {
    const connect = () => getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });
    const evidenceFor = (overrides) => ({
      item: { status: "SUCCESS", overallSuccess: true, startedAt: 1758700000000, finishedAt: 1758700005000, ...overrides },
    });

    test("is shown with the preview flag off, for the first property, and follows the picker", async () => {
      connect();

      render(<HostChannelDistribution />);

      expect(await screen.findByText("Property: Canal house")).toBeInTheDocument();
      await waitFor(() => expect(getLatestSyncEvidence).toHaveBeenCalledWith({ domitsPropertyId: "property-1" }));

      fireEvent.change(await screen.findByRole("combobox"), { target: { value: "property-2" } });

      expect(await screen.findByText("Property: Beach apartment")).toBeInTheDocument();
      await waitFor(() => expect(getLatestSyncEvidence).toHaveBeenLastCalledWith({ domitsPropertyId: "property-2" }));
    });

    test("names the only property when there is no picker", async () => {
      connect();
      getMappedProperties.mockResolvedValue([LISTINGS[0]]);

      render(<HostChannelDistribution />);

      expect(await screen.findByText("Property: Canal house")).toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(getLatestSyncEvidence).toHaveBeenCalledWith({ domitsPropertyId: "property-1" });
    });

    test("shows the outcome sentence of the latest sync", async () => {
      connect();
      getLatestSyncEvidence.mockResolvedValue(evidenceFor({ overallSuccess: false, status: "FAILED", errorCount: 1 }));

      render(<HostChannelDistribution />);

      expect(await screen.findByText(/^Last sync failed on /)).toBeInTheDocument();
    });

    test("shows a loading sentence while the last sync loads", async () => {
      connect();
      getLatestSyncEvidence.mockReturnValue(new Promise(() => {}));

      render(<HostChannelDistribution />);

      expect(await screen.findByText("Loading the last sync…")).toBeInTheDocument();
    });

    test("says no sync has run when the property has no evidence", async () => {
      connect();

      render(<HostChannelDistribution />);

      expect(await screen.findByText("No sync has run for this property yet.")).toBeInTheDocument();
    });

    test("shows a sentence on the card, not the page-wide error, when the last sync cannot be loaded", async () => {
      connect();
      getLatestSyncEvidence.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));

      render(<HostChannelDistribution />);

      expect(await screen.findByText("We couldn't load the last sync.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
      expect(screen.queryByText("Something went wrong loading your Channex connection.")).not.toBeInTheDocument();
    });

    test("shows no card and no sentence on a 404 CHANNEX_NOT_FOUND, because the status card covers it", async () => {
      connect();
      getLatestSyncEvidence.mockRejectedValue(
        Object.assign(new Error("not found"), { status: 404, responseBody: { errorCode: "CHANNEX_NOT_FOUND" } })
      );

      render(<HostChannelDistribution />);

      await waitFor(() => expect(getLatestSyncEvidence).toHaveBeenCalledTimes(1));
      await screen.findByText("Channex");
      await waitFor(() => expect(screen.queryByText("Loading the last sync…")).not.toBeInTheDocument());
      expect(screen.queryByText("Last sync")).not.toBeInTheDocument();
      expect(screen.queryByText(/Property: /)).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    test("is not shown, and nothing is requested, when no property is linked", async () => {
      connect();
      getMappedProperties.mockResolvedValue([]);

      render(<HostChannelDistribution />);

      await screen.findByText("No properties are linked to Channex yet.");
      expect(screen.queryByText("Last sync")).not.toBeInTheDocument();
      expect(getLatestSyncEvidence).not.toHaveBeenCalled();
    });

    test("is not shown, and nothing is requested, when Channex is not connected", async () => {
      getChannexStatus.mockResolvedValue({ status: "NOT_CONNECTED" });

      render(<HostChannelDistribution />);

      await screen.findByText("No channel connected yet");
      expect(screen.queryByText("Last sync")).not.toBeInTheDocument();
      expect(getLatestSyncEvidence).not.toHaveBeenCalled();
    });
  });

  // The Property mapping table still runs on mock data: it stays out of the tab, and its mock
  // function is never called, unless MOCK_PREVIEW_SECTIONS_ENABLED is on.
  test("with the preview flag off, renders no Property mapping and does not call its mock", async () => {
    getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });

    render(<HostChannelDistribution />);

    await screen.findByRole("combobox");
    expect(screen.queryByText("Property mapping")).not.toBeInTheDocument();
    expect(getPropertyMappingRows).not.toHaveBeenCalled();
  });

  describe("Property mapping section", () => {
    beforeEach(() => {
      service.MOCK_PREVIEW_SECTIONS_ENABLED = true;
    });

    test.each(["CONNECTED", "RECONNECT_REQUIRED", "VALIDATION_FAILED", "DISCONNECTED"])(
      "is shown and loads its rows for %s",
      async (status) => {
        getChannexStatus.mockResolvedValue({ status, displayName: "Channex" });

        render(<HostChannelDistribution />);

        expect(await screen.findByText("Property mapping")).toBeInTheDocument();
        await waitFor(() => expect(getPropertyMappingRows).toHaveBeenCalledTimes(1));
      }
    );

    // Nothing is confirmed to map against mid-validation, and without a connection there is no mapping.
    test.each([
      ["PENDING_PROVIDER_VALIDATION", "Validating…"],
      ["NOT_CONNECTED", "No channel connected yet"],
    ])("is hidden and its rows are not requested for %s", async (status, settledText) => {
      getChannexStatus.mockResolvedValue({ status, displayName: "Channex" });

      render(<HostChannelDistribution />);

      await screen.findByText(settledText);
      expect(screen.queryByText("Property mapping")).not.toBeInTheDocument();
      expect(getPropertyMappingRows).not.toHaveBeenCalled();
    });

    test("is hidden when the status request fails", async () => {
      getChannexStatus.mockRejectedValue(Object.assign(new Error("server exploded"), { status: 500 }));

      render(<HostChannelDistribution />);

      await screen.findByRole("alert");
      expect(screen.queryByText("Property mapping")).not.toBeInTheDocument();
      expect(getPropertyMappingRows).not.toHaveBeenCalled();
    });
  });

  // The modals only open while MOCK_CONNECT_FLOW_ENABLED is true, so these flip it on the mocked
  // service module. The view reads the export at render time, so the assignment takes effect.
  describe("refetches the status after a modal succeeds", () => {
    beforeEach(() => {
      service.MOCK_CONNECT_FLOW_ENABLED = true;
    });

    afterEach(() => {
      service.MOCK_CONNECT_FLOW_ENABLED = false;
    });

    test("Manage > Disconnect > confirm closes the modal and fetches the status a second time", async () => {
      const user = userEvent.setup();
      getChannexStatus
        .mockResolvedValueOnce({ status: "CONNECTED", displayName: "Channex" })
        .mockResolvedValueOnce({ status: "DISCONNECTED", displayName: "Channex", reason: "Disconnected in Domits." });
      disconnectChannex.mockResolvedValue({ disconnected: true });

      render(<HostChannelDistribution />);

      await user.click(await screen.findByRole("button", { name: "Manage" }));
      await user.click(screen.getByRole("button", { name: "Disconnect" }));
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Disconnect" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(disconnectChannex).toHaveBeenCalledTimes(1);
      expect(getChannexStatus).toHaveBeenCalledTimes(2);
      expect(await screen.findByText("Reconnect needed")).toBeInTheDocument();
    });

    test("+ Add channel > connect closes the modal and fetches the status a second time", async () => {
      const user = userEvent.setup();
      getChannexStatus
        .mockResolvedValueOnce({ status: "NOT_CONNECTED" })
        .mockResolvedValueOnce({ status: "CONNECTED", displayName: "Channex" });
      connectChannex.mockResolvedValue({ connected: true });

      render(<HostChannelDistribution />);

      const addButton = await screen.findByRole("button", { name: "+ Add channel" });
      await waitFor(() => expect(addButton).toBeEnabled());
      await user.click(addButton);
      await user.type(screen.getByLabelText("Channex API key"), "some-key");
      await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Connect" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(connectChannex).toHaveBeenCalledTimes(1);
      expect(getChannexStatus).toHaveBeenCalledTimes(2);
      expect(await screen.findByText("Connected")).toBeInTheDocument();
    });
  });
});
