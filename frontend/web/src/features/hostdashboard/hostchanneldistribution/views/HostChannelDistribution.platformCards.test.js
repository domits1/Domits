import React from "react";
import { render, screen } from "@testing-library/react";
import HostChannelDistribution from "./HostChannelDistribution";
import { getChannexStatus } from "../services/channexDistributionService";
import { getHostListings } from "../services/hostDistributionApi";

jest.mock("../../../../hooks/useFetchUser", () => ({ __esModule: true, default: () => "user-1" }));
jest.mock("../services/channexDistributionService");
jest.mock("../services/hostDistributionApi");

// The view reads the flag from the service module at render time, so tests flip it on the mocked module.
const hostApi = jest.requireMock("../services/hostDistributionApi");

describe("HostChannelDistribution with MOCK_HOST_DISTRIBUTION_ENABLED", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    hostApi.MOCK_HOST_DISTRIBUTION_ENABLED = false;
    jest.spyOn(console, "error").mockImplementation(() => {});
    getHostListings.mockResolvedValue({
      listings: [
        {
          propertyId: "p1",
          title: "Canal House",
          distribution: { status: "READY", missing: [] },
          channels: [{ otaCode: "BookingCom", label: "LIVE" }],
        },
      ],
    });
  });

  afterEach(() => {
    hostApi.MOCK_HOST_DISTRIBUTION_ENABLED = false;
  });

  test("with the flag off, shows no platform cards and asks for no listings", async () => {
    getChannexStatus.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    render(<HostChannelDistribution />);

    expect(await screen.findByText("No channel connected yet")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(getHostListings).not.toHaveBeenCalled();
  });

  test("with the flag on, shows the platform cards to a host who has no Channex account yet", async () => {
    hostApi.MOCK_HOST_DISTRIBUTION_ENABLED = true;
    getChannexStatus.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    render(<HostChannelDistribution />);

    expect(await screen.findByText("Booking.com")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.queryByText("No channel connected yet")).not.toBeInTheDocument();
  });

  test("with the flag on, the account-level load error is not shown", async () => {
    hostApi.MOCK_HOST_DISTRIBUTION_ENABLED = true;
    getChannexStatus.mockRejectedValue(Object.assign(new Error("server exploded"), { status: 500 }));

    render(<HostChannelDistribution />);

    expect(await screen.findByText("Booking.com")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong loading your Channex connection.")).not.toBeInTheDocument();
  });

  test("with the flag on, the account-level status card of a connected account is hidden", async () => {
    hostApi.MOCK_HOST_DISTRIBUTION_ENABLED = true;
    getChannexStatus.mockResolvedValue({ status: "CONNECTED", displayName: "Channex" });

    render(<HostChannelDistribution />);

    expect(await screen.findByText("Booking.com")).toBeInTheDocument();
    expect(screen.queryByText("Your Channex account is connected.")).not.toBeInTheDocument();
  });
});
