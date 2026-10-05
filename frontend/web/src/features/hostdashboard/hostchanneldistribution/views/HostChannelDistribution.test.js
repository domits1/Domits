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
} from "../services/channexDistributionService";

// Mutable so a test can model useFetchUser resolving the id after the first render.
let mockUserId = "user-1";
jest.mock("../../../../hooks/useFetchUser", () => ({ __esModule: true, default: () => mockUserId }));
jest.mock("../services/channexDistributionService");

const LISTINGS = [
  { property: { id: "property-1", title: "Canal house" } },
  { property: { id: "property-2", title: "Beach apartment" } },
];

describe("HostChannelDistribution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUserId = "user-1";
    jest.spyOn(console, "error").mockImplementation(() => {});
    getMappedProperties.mockResolvedValue(LISTINGS);
    getLatestSyncEvidence.mockResolvedValue({ item: null });
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

  test("defaults the property picker to the first listing and scopes the sync to the picked one", async () => {
    getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });

    render(<HostChannelDistribution />);

    const picker = await screen.findByRole("combobox");
    await waitFor(() => expect(getLatestSyncEvidence).toHaveBeenCalledWith({ domitsPropertyId: "property-1" }));
    expect(picker).toHaveValue("property-1");

    fireEvent.change(picker, { target: { value: "property-2" } });

    await waitFor(() => expect(getLatestSyncEvidence).toHaveBeenLastCalledWith({ domitsPropertyId: "property-2" }));
  });

  test("shows no picker and no sync card when no listing is mapped, instead of a false No sync yet", async () => {
    getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });
    getMappedProperties.mockResolvedValue([]);

    render(<HostChannelDistribution />);

    await screen.findByText("Channex");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("Last sync")).not.toBeInTheDocument();
    expect(screen.queryByText("No sync yet")).not.toBeInTheDocument();
    expect(getLatestSyncEvidence).not.toHaveBeenCalled();
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

  // The modals only open while MOCK_CONNECT_FLOW_ENABLED is true, so these flip it on the mocked
  // service module. The view reads the export at render time, so the assignment takes effect.
  describe("refetches the status after a modal succeeds", () => {
    const service = jest.requireMock("../services/channexDistributionService");

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
