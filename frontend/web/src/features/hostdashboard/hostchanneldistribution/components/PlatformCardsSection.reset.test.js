import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlatformCardsSection from "./PlatformCardsSection";
import { HOST_DISTRIBUTION_STATE, useHostDistribution } from "../hooks/useHostDistribution";

jest.mock("../hooks/useHostDistribution", () => ({
  ...jest.requireActual("../hooks/useHostDistribution"),
  useHostDistribution: jest.fn(),
}));
jest.mock("../services/hostDistributionApi");

const listing = (propertyId, title) => ({
  propertyId,
  title,
  distribution: { status: "READY", missing: [], timezone: { required: false, options: [] } },
  channels: [{ otaCode: "BookingCom", label: "LIVE" }],
});

const hostDistribution = (listings, loadState = HOST_DISTRIBUTION_STATE.LOADED) => ({
  listings,
  loadState,
  reload: jest.fn(),
  rereadListings: jest.fn(),
  refresh: jest.fn(),
  refreshingPropertyId: null,
  refreshFailedPropertyId: null,
});

const vrbo = () => screen.getByRole("switch", { name: "Vrbo distribution" });

// The flow lives in the section, but its modals go when the section stops showing the cards. These
// tests move the section between states by changing what the stubbed hook answers.
describe("PlatformCardsSection when the flow's modals unmount", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("a reload while the checklist is open ends the flow, so the switches are usable again", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(vrbo());
    expect(screen.getByRole("dialog", { name: "Connect Vrbo" })).toBeInTheDocument();

    useHostDistribution.mockReturnValue(hostDistribution([], HOST_DISTRIBUTION_STATE.LOADING));
    rerender(<PlatformCardsSection />);
    expect(screen.getByText("Loading your listings…")).toBeInTheDocument();

    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vrbo()).toBeEnabled();
  });

  test("the flow's listing disappearing ends the flow, so the next listing's switches are usable", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House"), listing("p2", "Beach House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(vrbo());
    expect(screen.getByRole("dialog", { name: "Connect Vrbo" })).toBeInTheDocument();

    useHostDistribution.mockReturnValue(hostDistribution([listing("p2", "Beach House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vrbo()).toBeEnabled();
  });

  test("an open flow stays open while its listing is still there and the section stays loaded", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(vrbo());

    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.getByRole("dialog", { name: "Connect Vrbo" })).toBeInTheDocument();
  });
});
