import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HostChannelDistribution from "./HostChannelDistribution";
import { useChannexDistribution } from "../hooks/useChannexDistribution";

jest.mock("../hooks/useChannexDistribution", () => ({
  useChannexDistribution: jest.fn(),
}));

const NOT_AVAILABLE_TEXT = "Channel distribution isn't available for your account yet.";
const GENERIC_ERROR_TEXT = "Something went wrong loading your Channex connection.";
const EMPTY_TEXT = "No channel connected yet";

describe("HostChannelDistribution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows nothing but the coming-soon cards while loading -- no empty, error or not-available block", () => {
    useChannexDistribution.mockReturnValue({
      status: null,
      syncEvidence: null,
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    render(<HostChannelDistribution />);

    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(NOT_AVAILABLE_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(GENERIC_ERROR_TEXT)).not.toBeInTheDocument();
  });

  test("shows the empty state when status is NOT_CONNECTED and there is no error", () => {
    useChannexDistribution.mockReturnValue({
      status: { status: "NOT_CONNECTED" },
      syncEvidence: null,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    render(<HostChannelDistribution />);

    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
  });

  test("shows the not-available notice for a 403 error, not the empty state, and has no Retry button", () => {
    useChannexDistribution.mockReturnValue({
      status: null,
      syncEvidence: null,
      loading: false,
      error: Object.assign(new Error("Forbidden"), { status: 403 }),
      refresh: jest.fn(),
    });

    render(<HostChannelDistribution />);

    expect(screen.getByText(NOT_AVAILABLE_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  test.each([
    ["a 401 error", Object.assign(new Error("Unauthorized"), { status: 401 })],
    ["a network failure with no status", new Error("GET /integrations/channex/status failed: Network request failed")],
  ])("shows the generic error notice with a working Retry button for %s", async (_label, error) => {
    const user = userEvent.setup();
    const refresh = jest.fn();
    useChannexDistribution.mockReturnValue({
      status: null,
      syncEvidence: null,
      loading: false,
      error,
      refresh,
    });

    render(<HostChannelDistribution />);

    expect(screen.getByText(GENERIC_ERROR_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_TEXT)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
