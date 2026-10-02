import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HostChannelDistribution from "./HostChannelDistribution";
import { getChannexStatus, getLatestSyncEvidence, getMappedProperties } from "../services/channexDistributionService";

jest.mock("../../../../hooks/useFetchUser", () => ({ __esModule: true, default: () => "user-1" }));
jest.mock("../services/channexDistributionService");

const LISTINGS = [
  { property: { id: "property-1", title: "Canal house" } },
  { property: { id: "property-2", title: "Beach apartment" } },
];

describe("HostChannelDistribution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
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
});
