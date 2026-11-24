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
  channels: [{ channelId: "c-BookingCom", otaCode: "BookingCom", label: "LIVE", upcomingBookingCount: 0 }],
});

const hostDistribution = (listings, loadState = HOST_DISTRIBUTION_STATE.LOADED) => ({
  listings,
  loadState,
  reload: jest.fn(),
  rereadListings: jest.fn(),
  refresh: jest.fn(),
  applyListing: jest.fn(),
  refreshingPropertyId: null,
  refreshFailedPropertyId: null,
});

const vrbo = () => screen.getByRole("switch", { name: "Vrbo distribution" });
const bookingCom = () => screen.getByRole("switch", { name: "Booking.com distribution" });

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

describe("PlatformCardsSection when the disconnect confirm's modal unmounts", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  test("a reload while the turn-off confirm is open ends the flow, so the switches are usable again", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(bookingCom());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    useHostDistribution.mockReturnValue(hostDistribution([], HOST_DISTRIBUTION_STATE.LOADING));
    rerender(<PlatformCardsSection />);
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vrbo()).toBeEnabled();
    expect(bookingCom()).toBeEnabled();
  });

  test("a reload that still lists the listing also ends the turn-off flow", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(bookingCom());

    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")], HOST_DISTRIBUTION_STATE.LOADING));
    rerender(<PlatformCardsSection />);
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(bookingCom()).toBeEnabled();
  });

  test("the flow's listing disappearing ends the flow, so the next listing's switches are usable", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House"), listing("p2", "Beach House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(bookingCom());
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    useHostDistribution.mockReturnValue(hostDistribution([listing("p2", "Beach House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(vrbo()).toBeEnabled();
  });

  test("an open turn-off confirm stays open while its listing is still there and the section stays loaded", async () => {
    const user = userEvent.setup();
    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    const { rerender } = render(<PlatformCardsSection />);
    await user.click(bookingCom());

    useHostDistribution.mockReturnValue(hostDistribution([listing("p1", "Canal House")]));
    rerender(<PlatformCardsSection />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
