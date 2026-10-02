import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import HostChannelDistribution from "./HostChannelDistribution";
import { getChannexStatus, getLatestSyncEvidence } from "../services/channexDistributionService";

jest.mock("../../../../hooks/useFetchUser", () => ({ __esModule: true, default: () => "user-1" }));
jest.mock("../services/channexDistributionService");

describe("HostChannelDistribution error handling", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
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

  test("shows a friendly error with a Retry button on a 500, and Retry fetches again", async () => {
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
});
