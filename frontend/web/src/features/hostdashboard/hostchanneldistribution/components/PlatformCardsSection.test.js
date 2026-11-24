import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlatformCardsSection from "./PlatformCardsSection";
import { createConnectSession, getHostListings, refreshChannels } from "../services/hostDistributionApi";

jest.mock("../services/hostDistributionApi");

const channel = (otaCode, label) => ({ otaCode, label });
const listing = (propertyId, title, overrides = {}) => ({
  propertyId,
  title,
  distribution: { status: "READY", missing: [] },
  channels: [],
  ...overrides,
});

const LIVE_LISTING = listing("p1", "Canal House", {
  channels: [channel("BookingCom", "LIVE"), channel("Airbnb", "SYNCING")],
});

// A promise the test settles by hand, so "while the request is pending" can be asserted.
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const cardFor = (name) => screen.getByText(name).closest(".chdist-card");

describe("PlatformCardsSection", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    getHostListings.mockResolvedValue({ listings: [LIVE_LISTING] });
  });

  test("shows a loading sentence, then the three OTA cards in a fixed order", async () => {
    const pending = deferred();
    getHostListings.mockReturnValue(pending.promise);

    render(<PlatformCardsSection />);
    expect(screen.getByText("Loading your listings…").tagName).toBe("OUTPUT");

    pending.resolve({ listings: [LIVE_LISTING] });
    await screen.findByText("Booking.com");

    expect(screen.queryByText("Loading your listings…")).not.toBeInTheDocument();
    const names = screen.getAllByRole("switch").map((control) => control.getAttribute("aria-label"));
    expect(names).toEqual(["Booking.com distribution", "Airbnb distribution", "Vrbo distribution"]);
  });

  test("shows each card's own state", async () => {
    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");

    expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
    expect(within(cardFor("Airbnb")).getByText("Syncing…")).toBeInTheDocument();
    expect(within(cardFor("Vrbo")).getByText("Not connected")).toBeInTheDocument();
  });

  describe("connect flow", () => {
    const URL_OK = "https://staging.channex.io/mock-connect?token=mock";
    const switchOf = (name) => screen.getByRole("switch", { name: `${name} distribution` });

    const openChecklist = async (user) => {
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");
      await user.click(switchOf("Vrbo"));
    };
    const tickAll = async (user) => {
      for (const box of screen.getAllByRole("checkbox")) await user.click(box);
    };
    const openIframe = async (user) => {
      createConnectSession.mockResolvedValue({ url: URL_OK });
      refreshChannels.mockResolvedValue({ listing: LIVE_LISTING });
      await openChecklist(user);
      await tickAll(user);
      await user.click(screen.getByRole("button", { name: "Continue" }));
      await screen.findByTitle("Connect Vrbo through Channex");
    };

    test("on a ready listing only the switches that are off are usable, the ones that are on stay disabled", async () => {
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");

      expect(switchOf("Booking.com")).toBeDisabled();
      expect(switchOf("Airbnb")).toBeDisabled();
      expect(switchOf("Vrbo")).toBeEnabled();
    });

    test("keeps every switch disabled for a listing whose distribution is not turned on yet", async () => {
      getHostListings.mockResolvedValue({
        listings: [listing("p2", "City Loft", { distribution: { status: "NOT_ENABLED" } })],
      });

      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");

      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
    });

    test("turning a switch on opens the checklist for that platform without any request", async () => {
      const user = userEvent.setup();

      await openChecklist(user);

      expect(screen.getByRole("dialog", { name: "Connect Vrbo" })).toBeInTheDocument();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test("cancelling the checklist closes it with no request and no refresh", async () => {
      const user = userEvent.setup();
      await openChecklist(user);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(createConnectSession).not.toHaveBeenCalled();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test("Continue asks for a session with the listing id only and opens the Channex screen", async () => {
      const user = userEvent.setup();
      createConnectSession.mockResolvedValue({ url: URL_OK });
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      const frame = await screen.findByTitle("Connect Vrbo through Channex");
      expect(frame).toHaveAttribute("src", URL_OK);
      expect(createConnectSession).toHaveBeenCalledTimes(1);
      expect(createConnectSession).toHaveBeenCalledWith({ propertyId: "p1" });
    });

    test("a failed session shows an alert and never opens the Channex screen", async () => {
      const user = userEvent.setup();
      createConnectSession.mockRejectedValue(new Error("boom"));
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't start the connection. Try again.");
      expect(screen.queryByTitle("Connect Vrbo through Channex")).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(refreshChannels).not.toHaveBeenCalled();
    });

    test.each([
      ["the X button", (user) => user.click(screen.getByRole("button", { name: "Close" }))],
      ["Escape", (user) => user.keyboard("{Escape}")],
      ["the backdrop", (user) => user.click(screen.getByRole("button", { name: "Close backdrop" }))],
      ["the Done button", (user) => user.click(screen.getByRole("button", { name: "Done" }))],
    ])("closing the Channex screen with %s refreshes the listing exactly once", async (_name, dismiss) => {
      const user = userEvent.setup();
      await openIframe(user);

      await dismiss(user);

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(screenSwitchesSettled()).toBe(true));
      expect(refreshChannels).toHaveBeenCalledTimes(1);
      expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p1" });
    });

    // Refresh puts the "Refreshing…" sentence up while it runs; once it is gone the close has finished.
    const screenSwitchesSettled = () => screen.queryByText("Refreshing…") === null;

    test("locks all three switches while the checklist is open", async () => {
      const user = userEvent.setup();
      await openChecklist(user);

      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
    });

    test("locks all three switches while connecting", async () => {
      const user = userEvent.setup();
      createConnectSession.mockReturnValue(deferred().promise);
      await openChecklist(user);
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByText("Connecting…").tagName).toBe("OUTPUT");
      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());
    });

    test("locks the property picker while connecting, so the flow cannot end up under another listing", async () => {
      const user = userEvent.setup();
      getHostListings.mockResolvedValue({
        listings: [
          LIVE_LISTING,
          listing("p2", "Beach Apartment", { distribution: { status: "NOT_ENABLED", missing: ["MISSING_PRICE"] } }),
        ],
      });
      createConnectSession.mockReturnValue(deferred().promise);
      render(<PlatformCardsSection />);
      await screen.findByText("Booking.com");
      await user.click(switchOf("Vrbo"));
      await tickAll(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(screen.getByRole("combobox", { name: "Property" })).toBeDisabled();
    });

    test("locks all three switches while the Channex screen is open, and unlocks them after it closes", async () => {
      const user = userEvent.setup();
      await openIframe(user);
      screen.getAllByRole("switch").forEach((control) => expect(control).toBeDisabled());

      await user.click(screen.getByRole("button", { name: "Done" }));

      await waitFor(() => expect(switchOf("Vrbo")).toBeEnabled());
    });
  });

  test("shows an error with Retry when the listings cannot be loaded, and Retry fetches again", async () => {
    const user = userEvent.setup();
    getHostListings.mockRejectedValueOnce(new Error("boom"));

    render(<PlatformCardsSection />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load your listings.");
    expect(console.error).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Booking.com")).toBeInTheDocument();
    expect(getHostListings).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("says so when the host has no listings", async () => {
    getHostListings.mockResolvedValue({ listings: [] });

    render(<PlatformCardsSection />);

    expect(await screen.findByText("You have no listings yet.")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  test("shows only the notice, without cards or Refresh, for a listing that is not ready", async () => {
    getHostListings.mockResolvedValue({
      listings: [
        listing("p2", "Beach Apartment", {
          distribution: { status: "NOT_ENABLED", missing: ["MISSING_ADDRESS", "MISSING_PRICE"] },
        }),
      ],
    });

    render(<PlatformCardsSection />);

    expect(await screen.findByText("Add the address")).toBeInTheDocument();
    expect(screen.getByText("Add a price")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh" })).not.toBeInTheDocument();
  });

  test("offers a picker only for several listings, and shows the picked listing's cards", async () => {
    const user = userEvent.setup();
    getHostListings.mockResolvedValue({
      listings: [LIVE_LISTING, listing("p2", "Beach Apartment", { channels: [channel("Vrbo", "NEEDS_ATTENTION")] })],
    });

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    expect(within(cardFor("Vrbo")).getByText("Not connected")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Property" }), "p2");

    expect(within(cardFor("Vrbo")).getByText("Needs attention")).toBeInTheDocument();
    expect(within(cardFor("Booking.com")).getByText("Not connected")).toBeInTheDocument();
  });

  test("has no picker for a single listing", async () => {
    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  test("Refresh asks for the picked listing's channels and updates its cards", async () => {
    const user = userEvent.setup();
    refreshChannels.mockResolvedValue({
      listing: { ...LIVE_LISTING, channels: [channel("BookingCom", "LIVE"), channel("Airbnb", "LIVE")] },
    });

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => expect(within(cardFor("Airbnb")).getByText("Live")).toBeInTheDocument());
    expect(refreshChannels).toHaveBeenCalledWith({ propertyId: "p1" });
  });

  test("while refreshing, Refresh is disabled and a sentence says so", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    refreshChannels.mockReturnValue(pending.promise);

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    expect(screen.getByText("Refreshing…").tagName).toBe("OUTPUT");

    pending.resolve({ listing: LIVE_LISTING });
    await waitFor(() => expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled());
    expect(screen.queryByText("Refreshing…")).not.toBeInTheDocument();
  });

  test("a refresh answer without a usable listing counts as a failed refresh and keeps the cards", async () => {
    const user = userEvent.setup();
    refreshChannels.mockResolvedValue({});

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't refresh your connections.");
    expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
  });

  test("the refresh error belongs to the listing it failed for, not to the next one picked", async () => {
    const user = userEvent.setup();
    getHostListings.mockResolvedValue({ listings: [LIVE_LISTING, listing("p2", "Beach Apartment")] });
    refreshChannels.mockRejectedValue(new Error("boom"));

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Property" }), "p2");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("a failed refresh keeps the cards, says so, and the next successful refresh clears the message", async () => {
    const user = userEvent.setup();
    refreshChannels.mockRejectedValueOnce(new Error("boom"));
    refreshChannels.mockResolvedValue({ listing: LIVE_LISTING });

    render(<PlatformCardsSection />);
    await screen.findByText("Booking.com");
    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't refresh your connections.");
    expect(within(cardFor("Booking.com")).getByText("Live")).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
